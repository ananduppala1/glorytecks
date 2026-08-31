import multer from 'multer';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ApiError } from '../utils/ApiError';
import { env } from '../config/env';
import { logger } from '../config/logger';
import {
  inspectBuffer,
  sanitizeFilename,
  extensionOf,
  EXT_TO_FORMAT,
  MIME_TO_FORMAT,
  FORMATS,
  FormatId,
  DetectedFormat,
} from '../utils/fileSignature';
import { validateSvg } from '../utils/svgGuard';

/**
 * Upload ingest pipeline.
 *
 * Four gates, cheapest first, so a hostile request is dropped before it costs
 * anything:
 *
 *   1. preflight   — content-type and Content-Length, before a byte is read.
 *   2. concurrency — a hard cap on simultaneous in-memory buffers.
 *   3. multer      — per-file and per-part limits while buffering.
 *   4. verify      — structural inspection of the bytes actually received.
 *
 * Gate 4 is the one that decides what the file *is*. Gates 1–3 exist so that
 * decision is only ever made about a small, bounded buffer.
 */

/* ────────────────────────────────────────────────────────────────────────── *
 * Which formats each endpoint accepts
 * ────────────────────────────────────────────────────────────────────────── */

/** Formats the image endpoint accepts, after applying the env feature flags. */
export function allowedImageFormats(): FormatId[] {
  const ids: FormatId[] = ['jpeg', 'png', 'webp', 'avif'];
  if (env.upload.allowGif) ids.push('gif');
  // SVG is executable markup. Off unless an operator explicitly opts in, and
  // even then every document must pass utils/svgGuard.
  if (env.upload.allowSvg) ids.push('svg');
  return ids;
}

/** Formats the document endpoint accepts. Images are NOT among them. */
export function allowedDocumentFormats(): FormatId[] {
  const ids: FormatId[] = ['pdf', 'docx'];
  if (env.upload.allowLegacyDoc) ids.push('doc');
  return ids;
}

/** MIME types a browser may legitimately label each allowed format with. */
function acceptableMimes(ids: FormatId[]): Set<string> {
  const out = new Set<string>();
  for (const [mime, id] of Object.entries(MIME_TO_FORMAT)) {
    if (ids.includes(id)) out.add(mime);
  }
  return out;
}

/** Extensions a browser may legitimately give each allowed format. */
function acceptableExtensions(ids: FormatId[]): Set<string> {
  const out = new Set<string>();
  for (const [ext, id] of Object.entries(EXT_TO_FORMAT)) {
    if (ids.includes(id)) out.add(ext);
  }
  return out;
}

/** The `accept` attribute value the admin UI should advertise for a kind. */
export function acceptAttributeFor(kind: UploadKind): string {
  const ids = kind === 'image' ? allowedImageFormats() : allowedDocumentFormats();
  const parts = new Set<string>();
  for (const id of ids) {
    parts.add(FORMATS[id].mime);
    parts.add(`.${FORMATS[id].ext}`);
    for (const alt of FORMATS[id].altExts) parts.add(`.${alt}`);
  }
  return [...parts].join(',');
}

export type UploadKind = 'image' | 'document';

/** What a verified upload looks like once it reaches the controller. */
export interface VerifiedUpload {
  buffer: Buffer;
  format: DetectedFormat;
  /** Filename stripped down to safe characters. Display only — never an id. */
  safeName: string;
  size: number;
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Gate 1 — preflight
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Reject an over-large or non-multipart request before the body is read.
 *
 * `express.json`'s 2 MB limit does not apply to `multipart/form-data` — that
 * body never reaches the JSON parser — so without this a caller could stream
 * an arbitrarily large body and multer would buffer it up to the point the
 * per-file limit tripped, once per concurrent request.
 */
function preflight(maxFileBytes: number): RequestHandler {
  // Room for the multipart envelope: boundaries, part headers, the folder field.
  const ceiling = maxFileBytes + 64 * 1024;

  return (req: Request, _res: Response, next: NextFunction) => {
    const contentType = req.headers['content-type'] ?? '';
    if (!contentType.toLowerCase().startsWith('multipart/form-data')) {
      return next(ApiError.badRequest('Upload must be sent as multipart/form-data'));
    }

    const declared = Number(req.headers['content-length']);
    if (Number.isFinite(declared) && declared > ceiling) {
      return next(ApiError.payloadTooLarge('File is larger than the allowed limit'));
    }
    return next();
  };
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Gate 2 — concurrency
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * multer's memoryStorage keeps each upload in the heap for the whole request.
 * The per-file limit therefore bounds one upload; only this bounds the process.
 *
 * Memory storage is kept deliberately: the alternative, spooling to disk, puts
 * attacker-supplied bytes on the application filesystem — the exact thing the
 * "uploads must never become application code" requirement rules out. A bounded
 * number of bounded buffers is the safer trade, and the bound is explicit here.
 */
let inFlight = 0;

const concurrencyGuard: RequestHandler = (req, res, next) => {
  if (inFlight >= env.upload.maxConcurrent) {
    return next(ApiError.serviceUnavailable('Server is busy, please retry in a moment'));
  }
  inFlight += 1;
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    inFlight -= 1;
    // Drop the reference to the buffered file so it can be collected as soon
    // as the response is done, rather than at the end of the event loop turn.
    if (req.file) req.file.buffer = Buffer.alloc(0);
  };
  res.on('finish', release);
  res.on('close', release);
  return next();
};

/* ────────────────────────────────────────────────────────────────────────── *
 * Gate 3 — multer
 * ────────────────────────────────────────────────────────────────────────── */

const storage = multer.memoryStorage();

/**
 * A cheap pre-filter on the part headers.
 *
 * This is NOT the security boundary — `mimetype` and `originalname` are both
 * written by the client. It only avoids buffering a part that is obviously not
 * something we would accept. The real decision is made in `verifyUpload`,
 * against the bytes.
 */
function headerFilter(ids: FormatId[]) {
  const mimes = acceptableMimes(ids);
  const exts = acceptableExtensions(ids);

  return (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Deliberately generic: echoing the client's Content-Type back into the
    // error message reflects attacker-chosen text into the admin UI.
    const reject = () => cb(ApiError.badRequest('Unsupported file type'));

    const mime = String(file.mimetype ?? '')
      .split(';')[0]
      .trim()
      .toLowerCase();
    if (!mimes.has(mime)) return reject();

    // An extension that contradicts the declared type is spoofing; there is no
    // legitimate reason for `photo.exe` to arrive labelled `image/png`.
    const ext = extensionOf(file.originalname);
    if (ext && !exts.has(ext)) return reject();

    if (String(file.originalname ?? '').length > env.upload.maxFilenameLength) {
      return cb(ApiError.badRequest('Filename is too long'));
    }
    return cb(null, true);
  };
}

function build(kind: UploadKind): RequestHandler {
  const ids = kind === 'image' ? allowedImageFormats() : allowedDocumentFormats();
  const maxBytes = kind === 'image' ? env.upload.imageMaxBytes : env.upload.docMaxBytes;

  return multer({
    storage,
    limits: {
      fileSize: maxBytes,
      files: env.upload.maxFiles,
      fields: env.upload.maxFields,
      fieldSize: env.upload.maxFieldSizeBytes,
      fieldNameSize: env.upload.maxFieldNameSizeBytes,
      parts: env.upload.maxParts,
      headerPairs: env.upload.maxHeaderPairs,
    },
    fileFilter: headerFilter(ids),
  }).single('file');
}

/**
 * Translate multer's own errors into the API's error shape.
 *
 * Left alone, `LIMIT_FILE_SIZE` and friends reach the global handler as a bare
 * `MulterError` whose library-internal message is forwarded to the client, and
 * an aborted upload surfaces as a 500 with a stack trace in the logs. Neither
 * is a server fault and neither should read like one.
 */
function runMulter(handler: RequestHandler, maxBytes: number): RequestHandler {
  return (req, res, next) => {
    handler(req, res, (err: unknown) => {
      if (!err) return next();

      if (err instanceof ApiError) return next(err);

      if (err instanceof Error && err.name === 'MulterError') {
        const code = (err as multer.MulterError).code;
        switch (code) {
          case 'LIMIT_FILE_SIZE':
            return next(
              ApiError.payloadTooLarge(
                `File is larger than the ${Math.floor(maxBytes / (1024 * 1024))}MB limit`,
              ),
            );
          case 'LIMIT_FILE_COUNT':
          case 'LIMIT_UNEXPECTED_FILE':
            return next(ApiError.badRequest('Send exactly one file in the "file" field'));
          case 'LIMIT_PART_COUNT':
          case 'LIMIT_FIELD_COUNT':
          case 'LIMIT_FIELD_KEY':
          case 'LIMIT_FIELD_VALUE':
            return next(ApiError.badRequest('Upload form contains too much data'));
          default:
            return next(ApiError.badRequest('Upload could not be read'));
        }
      }

      // A truncated or malformed body, or a client that hung up. Client-caused,
      // so a 400 — but worth a log line, without a stack.
      logger.warn('Upload stream failed', {
        reason: err instanceof Error ? err.message : 'unknown',
      });
      return next(ApiError.badRequest('Upload could not be read'));
    });
  };
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Gate 4 — content verification
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Decide what the uploaded bytes actually are, and refuse anything else.
 *
 * Everything the client asserted is discarded here. The detected format
 * becomes the source of truth for the stored MIME type, the extension, and the
 * Cloudinary resource type.
 */
function verifyUpload(kind: UploadKind): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const ids = kind === 'image' ? allowedImageFormats() : allowedDocumentFormats();
    const maxBytes = kind === 'image' ? env.upload.imageMaxBytes : env.upload.docMaxBytes;

    const file = req.file;
    // Leave the "no file" case to the controller, which already words it.
    if (!file) return next();

    const buffer = file.buffer;
    if (!buffer || buffer.length === 0) {
      return next(ApiError.badRequest('File is empty'));
    }
    // multer's own limit is a stream guard; re-check the buffer we ended up
    // with, and reject files too small to be anything real.
    if (buffer.length > maxBytes) {
      return next(ApiError.payloadTooLarge('File is larger than the allowed limit'));
    }
    if (buffer.length < env.upload.minBytes) {
      return next(ApiError.badRequest('File is empty or truncated'));
    }

    const inspection = inspectBuffer(buffer, {
      zipMaxEntries: env.upload.zipMaxEntries,
      zipMaxTotalUncompressedBytes: env.upload.zipMaxTotalUncompressedBytes,
      zipMaxCompressionRatio: env.upload.zipMaxCompressionRatio,
      rejectActivePdf: env.upload.rejectActivePdf,
    });

    if (!inspection.ok) {
      logger.warn('Upload rejected by content inspection', {
        kind,
        reason: inspection.reason,
        declaredMime: String(file.mimetype ?? '').slice(0, 64),
        bytes: buffer.length,
        userId: req.user?.id,
      });
      return next(ApiError.badRequest(inspection.reason));
    }

    const format = inspection.format;

    // The bytes are a format we can parse — but is it one THIS endpoint takes?
    if (!ids.includes(format.id)) {
      logger.warn('Upload rejected: format not allowed on this endpoint', {
        kind,
        detected: format.id,
        userId: req.user?.id,
      });
      return next(ApiError.badRequest(`${format.ext.toUpperCase()} files are not accepted here`));
    }

    // SVG is admitted only when it is provably inert.
    if (format.id === 'svg') {
      const verdict = validateSvg(buffer);
      if (!verdict.ok) {
        logger.warn('SVG upload rejected', { reason: verdict.reason, userId: req.user?.id });
        return next(ApiError.badRequest(verdict.reason));
      }
    }

    // Cross-check the client's claims against reality. A mismatch is not fatal
    // on its own — browsers get MIME types wrong — but a *contradiction*
    // between a recognised claim and the bytes is spoofing.
    const declaredMime = String(file.mimetype ?? '')
      .split(';')[0]
      .trim()
      .toLowerCase();
    const claimedFormat = MIME_TO_FORMAT[declaredMime];
    if (claimedFormat && claimedFormat !== format.id) {
      logger.warn('Upload rejected: declared type contradicts content', {
        declared: claimedFormat,
        detected: format.id,
        userId: req.user?.id,
      });
      return next(ApiError.badRequest('File contents do not match the declared file type'));
    }

    const ext = extensionOf(file.originalname);
    const extFormat = ext ? EXT_TO_FORMAT[ext] : undefined;
    if (extFormat && extFormat !== format.id) {
      return next(ApiError.badRequest('File contents do not match the file extension'));
    }

    req.upload = {
      buffer,
      format,
      safeName: sanitizeFilename(file.originalname, env.upload.maxFilenameLength),
      size: buffer.length,
    };
    return next();
  };
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Exported chains
 * ────────────────────────────────────────────────────────────────────────── */

/** Single image upload under field name "file", fully verified. */
export const uploadImage: RequestHandler[] = [
  preflight(env.upload.imageMaxBytes),
  concurrencyGuard,
  runMulter(build('image'), env.upload.imageMaxBytes),
  verifyUpload('image'),
];

/** Single document upload under field name "file", fully verified. */
export const uploadDocument: RequestHandler[] = [
  preflight(env.upload.docMaxBytes),
  concurrencyGuard,
  runMulter(build('document'), env.upload.docMaxBytes),
  verifyUpload('document'),
];
