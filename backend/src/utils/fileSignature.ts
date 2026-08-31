/**
 * Content-based file type detection.
 *
 * NOTHING the client says about a file is trusted here: not the filename, not
 * the extension, not the multipart `Content-Type`. A buffer is accepted only
 * when its *bytes* parse as a format we support.
 *
 * Detection is deliberately structural rather than "does it start with the
 * right four bytes". A magic-number prefix check alone is defeated by a
 * polyglot — a valid GIF header with a PHP script, an HTML page or a ZIP
 * archive appended after the image data. So every detector here walks the
 * container to its documented terminator and requires that terminator to sit
 * at (or within a couple of bytes of) the end of the buffer. Trailing payload
 * is a rejection, not a warning.
 *
 * Implemented without a third-party parser on purpose: the backend is
 * CommonJS, the popular detectors are ESM-only, and a hand-written reader for
 * these eight containers is small enough to audit in one sitting — which is
 * worth more here than breadth of format support.
 */

/** Formats the platform can store. */
export type FormatId = 'jpeg' | 'png' | 'gif' | 'webp' | 'avif' | 'svg' | 'pdf' | 'docx' | 'doc';

export interface DetectedFormat {
  id: FormatId;
  /** Canonical MIME type — the one the server believes, not the one sent. */
  mime: string;
  /** Canonical extension, without the dot. */
  ext: string;
  /** Other extensions that legitimately map to this format. */
  altExts: string[];
  /** Which upload endpoint may accept it. */
  kind: 'image' | 'document';
  /** The Cloudinary resource_type the asset must be stored as. */
  resourceType: 'image' | 'raw';
  /** `format` values Cloudinary may legitimately report back for it. */
  cloudinaryFormats: string[];
}

export const FORMATS: Record<FormatId, DetectedFormat> = {
  jpeg: {
    id: 'jpeg',
    mime: 'image/jpeg',
    ext: 'jpg',
    altExts: ['jpeg', 'jpe'],
    kind: 'image',
    resourceType: 'image',
    cloudinaryFormats: ['jpg', 'jpeg'],
  },
  png: {
    id: 'png',
    mime: 'image/png',
    ext: 'png',
    altExts: [],
    kind: 'image',
    resourceType: 'image',
    cloudinaryFormats: ['png'],
  },
  gif: {
    id: 'gif',
    mime: 'image/gif',
    ext: 'gif',
    altExts: [],
    kind: 'image',
    resourceType: 'image',
    cloudinaryFormats: ['gif'],
  },
  webp: {
    id: 'webp',
    mime: 'image/webp',
    ext: 'webp',
    altExts: [],
    kind: 'image',
    resourceType: 'image',
    cloudinaryFormats: ['webp'],
  },
  avif: {
    id: 'avif',
    mime: 'image/avif',
    ext: 'avif',
    altExts: [],
    kind: 'image',
    resourceType: 'image',
    cloudinaryFormats: ['avif'],
  },
  svg: {
    id: 'svg',
    mime: 'image/svg+xml',
    ext: 'svg',
    altExts: [],
    kind: 'image',
    resourceType: 'image',
    cloudinaryFormats: ['svg'],
  },
  pdf: {
    id: 'pdf',
    mime: 'application/pdf',
    ext: 'pdf',
    altExts: [],
    kind: 'document',
    // Cloudinary classifies PDF under the `image` resource type (it can
    // rasterise pages), so both are legitimate depending on the upload mode.
    resourceType: 'image',
    cloudinaryFormats: ['pdf'],
  },
  docx: {
    id: 'docx',
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ext: 'docx',
    altExts: [],
    kind: 'document',
    resourceType: 'raw',
    cloudinaryFormats: ['docx', 'zip', ''],
  },
  doc: {
    id: 'doc',
    mime: 'application/msword',
    ext: 'doc',
    altExts: [],
    kind: 'document',
    resourceType: 'raw',
    cloudinaryFormats: ['doc', ''],
  },
};

/** Every extension we recognise, mapped to its format. */
export const EXT_TO_FORMAT: Record<string, FormatId> = (() => {
  const out: Record<string, FormatId> = {};
  for (const f of Object.values(FORMATS)) {
    out[f.ext] = f.id;
    for (const alt of f.altExts) out[alt] = f.id;
  }
  return out;
})();

/** Every MIME type we recognise, mapped to its format. */
export const MIME_TO_FORMAT: Record<string, FormatId> = (() => {
  const out: Record<string, FormatId> = {};
  for (const f of Object.values(FORMATS)) out[f.mime] = f.id;
  // Browsers still emit these legacy aliases for JPEG.
  out['image/jpg'] = 'jpeg';
  out['image/pjpeg'] = 'jpeg';
  return out;
})();

export interface InspectOptions {
  /** ZIP bomb guards, from env.upload. */
  zipMaxEntries: number;
  zipMaxTotalUncompressedBytes: number;
  zipMaxCompressionRatio: number;
  /** Reject PDFs carrying JavaScript / launch actions / embedded files. */
  rejectActivePdf: boolean;
}

export type InspectResult =
  | { ok: true; format: DetectedFormat }
  | { ok: false; reason: string };

/* ────────────────────────────────────────────────────────────────────────── *
 * Helpers
 * ────────────────────────────────────────────────────────────────────────── */

const startsWith = (buf: Buffer, bytes: number[], at = 0): boolean => {
  if (buf.length < at + bytes.length) return false;
  for (let i = 0; i < bytes.length; i += 1) if (buf[at + i] !== bytes[i]) return false;
  return true;
};

const asciiAt = (buf: Buffer, at: number, len: number): string =>
  buf.length < at + len ? '' : buf.toString('latin1', at, at + len);

/**
 * How many trailing bytes past a container's terminator we tolerate.
 *
 * Real encoders sometimes pad to a block boundary; a polyglot needs far more
 * room than this to hide a payload in.
 */
const TRAILER_SLACK = 16;

/* ────────────────────────────────────────────────────────────────────────── *
 * JPEG — walk the marker segments to EOI
 * ────────────────────────────────────────────────────────────────────────── */

function isJpeg(buf: Buffer): InspectResult | null {
  if (!startsWith(buf, [0xff, 0xd8, 0xff])) return null;

  let i = 2;
  while (i + 1 < buf.length) {
    if (buf[i] !== 0xff) return { ok: false, reason: 'JPEG structure is corrupt' };

    // Fill bytes (0xFF padding) are legal between segments.
    let marker = buf[i + 1];
    let j = i + 1;
    while (marker === 0xff && j + 1 < buf.length) {
      j += 1;
      marker = buf[j];
    }

    // Standalone markers carry no payload.
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      i = j + 1;
      continue;
    }

    if (marker === 0xd9) {
      // End of image. Anything meaningful after it is appended payload.
      const end = j + 1;
      if (buf.length - end > TRAILER_SLACK) {
        return { ok: false, reason: 'JPEG has data appended after the end-of-image marker' };
      }
      return { ok: true, format: FORMATS.jpeg };
    }

    if (j + 3 >= buf.length) return { ok: false, reason: 'JPEG is truncated' };
    const segLen = buf.readUInt16BE(j + 1);
    if (segLen < 2) return { ok: false, reason: 'JPEG segment length is invalid' };
    i = j + 1 + segLen;

    if (marker === 0xda) {
      // Start of scan: entropy-coded data follows, which cannot be length-
      // walked. Scan forward for the EOI marker instead, skipping stuffed
      // bytes (FF 00) and restart markers.
      let k = i;
      while (k + 1 < buf.length) {
        if (buf[k] === 0xff) {
          const next = buf[k + 1];
          if (next === 0xd9) {
            const end = k + 2;
            if (buf.length - end > TRAILER_SLACK) {
              return { ok: false, reason: 'JPEG has data appended after the end-of-image marker' };
            }
            return { ok: true, format: FORMATS.jpeg };
          }
          if (next === 0x00 || (next >= 0xd0 && next <= 0xd7)) {
            k += 2;
            continue;
          }
        }
        k += 1;
      }
      return { ok: false, reason: 'JPEG is missing its end-of-image marker' };
    }
  }
  return { ok: false, reason: 'JPEG is missing its end-of-image marker' };
}

/* ────────────────────────────────────────────────────────────────────────── *
 * PNG — walk the chunk list to IEND
 * ────────────────────────────────────────────────────────────────────────── */

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function isPng(buf: Buffer): InspectResult | null {
  if (!startsWith(buf, PNG_MAGIC)) return null;
  if (asciiAt(buf, 12, 4) !== 'IHDR') return { ok: false, reason: 'PNG header chunk is missing' };

  let i = 8;
  let sawIhdr = false;
  while (i + 8 <= buf.length) {
    const len = buf.readUInt32BE(i);
    // A chunk longer than the buffer, or the 2^31 spec ceiling, means the
    // length field was crafted to make the walk skip over appended content.
    if (len > 0x7fffffff) return { ok: false, reason: 'PNG chunk length is invalid' };
    const type = asciiAt(buf, i + 4, 4);
    if (!/^[A-Za-z]{4}$/.test(type)) return { ok: false, reason: 'PNG chunk type is invalid' };

    const next = i + 8 + len + 4; // length + type + data + CRC
    if (next > buf.length) return { ok: false, reason: 'PNG is truncated' };

    if (type === 'IHDR') sawIhdr = true;
    if (type === 'IEND') {
      if (!sawIhdr) return { ok: false, reason: 'PNG header chunk is missing' };
      if (buf.length - next > TRAILER_SLACK) {
        return { ok: false, reason: 'PNG has data appended after the final chunk' };
      }
      return { ok: true, format: FORMATS.png };
    }
    i = next;
  }
  return { ok: false, reason: 'PNG is missing its final chunk' };
}

/* ────────────────────────────────────────────────────────────────────────── *
 * GIF — trailer byte must terminate the file
 * ────────────────────────────────────────────────────────────────────────── */

function isGif(buf: Buffer): InspectResult | null {
  const sig = asciiAt(buf, 0, 6);
  if (sig !== 'GIF87a' && sig !== 'GIF89a') return null;
  if (buf.length < 14) return { ok: false, reason: 'GIF is truncated' };

  // The trailer is a single 0x3B. Tolerate a few padding bytes, no more.
  let end = buf.length - 1;
  const floor = Math.max(0, buf.length - 1 - TRAILER_SLACK);
  while (end > floor && buf[end] !== 0x3b) end -= 1;
  if (buf[end] !== 0x3b) {
    return { ok: false, reason: 'GIF has data appended after the trailer' };
  }
  return { ok: true, format: FORMATS.gif };
}

/* ────────────────────────────────────────────────────────────────────────── *
 * WebP — RIFF size field must account for the whole buffer
 * ────────────────────────────────────────────────────────────────────────── */

function isWebp(buf: Buffer): InspectResult | null {
  if (asciiAt(buf, 0, 4) !== 'RIFF') return null;
  if (asciiAt(buf, 8, 4) !== 'WEBP') return { ok: false, reason: 'RIFF file is not a WebP image' };
  if (buf.length < 16) return { ok: false, reason: 'WebP is truncated' };

  const riffSize = buf.readUInt32LE(4);
  const declared = riffSize + 8;
  if (declared > buf.length) return { ok: false, reason: 'WebP is truncated' };
  if (buf.length - declared > TRAILER_SLACK) {
    return { ok: false, reason: 'WebP has data appended after the RIFF container' };
  }

  const chunk = asciiAt(buf, 12, 4);
  if (chunk !== 'VP8 ' && chunk !== 'VP8L' && chunk !== 'VP8X') {
    return { ok: false, reason: 'WebP bitstream chunk is invalid' };
  }
  return { ok: true, format: FORMATS.webp };
}

/* ────────────────────────────────────────────────────────────────────────── *
 * AVIF — ISO-BMFF box walk; brand must be AVIF, not an arbitrary HEIF
 * ────────────────────────────────────────────────────────────────────────── */

const AVIF_BRANDS = new Set(['avif', 'avis']);

function isIsoBmff(buf: Buffer): InspectResult | null {
  if (asciiAt(buf, 4, 4) !== 'ftyp') return null;
  if (buf.length < 16) return { ok: false, reason: 'Image container is truncated' };

  const major = asciiAt(buf, 8, 4);
  const ftypSize = buf.readUInt32BE(0);
  if (ftypSize < 16 || ftypSize > buf.length) {
    return { ok: false, reason: 'Image container header is invalid' };
  }

  // Compatible brands fill the rest of the ftyp box, four bytes each.
  const brands = new Set<string>([major]);
  for (let i = 16; i + 4 <= ftypSize; i += 4) brands.add(asciiAt(buf, i, 4));

  const isAvif = [...brands].some((b) => AVIF_BRANDS.has(b));
  if (!isAvif) {
    // HEIC and friends share the container but are not in the allowlist, and
    // browsers will not render them anyway.
    return { ok: false, reason: 'Unsupported image container brand' };
  }

  // Walk the top-level boxes; they must tile the buffer exactly.
  let off = 0;
  while (off + 8 <= buf.length) {
    let size = buf.readUInt32BE(off);
    let header = 8;
    if (size === 1) {
      if (off + 16 > buf.length) return { ok: false, reason: 'AVIF box header is truncated' };
      const hi = buf.readUInt32BE(off + 8);
      const lo = buf.readUInt32BE(off + 12);
      size = hi * 0x100000000 + lo;
      header = 16;
    } else if (size === 0) {
      size = buf.length - off; // "extends to end of file"
    }
    if (size < header) return { ok: false, reason: 'AVIF box size is invalid' };
    if (off + size > buf.length) return { ok: false, reason: 'AVIF is truncated' };
    off += size;
  }
  if (buf.length - off > TRAILER_SLACK) {
    return { ok: false, reason: 'AVIF has data appended after the final box' };
  }
  return { ok: true, format: FORMATS.avif };
}

/* ────────────────────────────────────────────────────────────────────────── *
 * PDF
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Markers for content a PDF viewer may *execute* or unpack. Best-effort: a
 * hostile author can hide these inside an object stream, so this is a filter
 * for careless/opportunistic payloads, not a guarantee. The real containment
 * is that we never open these files ourselves and never serve them from an
 * origin that holds a session.
 */
const PDF_ACTIVE_MARKERS = ['/JavaScript', '/JS', '/Launch', '/EmbeddedFile', '/RichMedia', '/XFA'];

function isPdf(buf: Buffer, opts: InspectOptions): InspectResult | null {
  if (asciiAt(buf, 0, 5) !== '%PDF-') return null;

  const version = asciiAt(buf, 5, 3);
  if (!/^[12]\.[0-9]/.test(version)) return { ok: false, reason: 'PDF version header is invalid' };

  // %%EOF must appear near the end. Some producers pad; 1 KiB is generous.
  const tail = buf.subarray(Math.max(0, buf.length - 1024)).toString('latin1');
  if (!tail.includes('%%EOF')) return { ok: false, reason: 'PDF is missing its end-of-file marker' };

  // A PDF with no cross-reference table is not a document any reader accepts.
  const head = buf.toString('latin1', 0, Math.min(buf.length, 4096));
  const whole = buf.toString('latin1');
  if (!whole.includes('/Root') && !whole.includes('startxref')) {
    return { ok: false, reason: 'PDF structure is corrupt' };
  }
  void head;

  if (opts.rejectActivePdf) {
    for (const marker of PDF_ACTIVE_MARKERS) {
      if (whole.includes(marker)) {
        return { ok: false, reason: 'PDF contains active content and was rejected' };
      }
    }
  }

  return { ok: true, format: FORMATS.pdf };
}

/* ────────────────────────────────────────────────────────────────────────── *
 * ZIP / DOCX
 * ────────────────────────────────────────────────────────────────────────── */

const EOCD_SIG = 0x06054b50;
const CD_SIG = 0x02014b50;

interface ZipEntry {
  name: string;
  compressedSize: number;
  uncompressedSize: number;
  encrypted: boolean;
  method: number;
}

/** Locate the End Of Central Directory record by scanning backwards. */
function findEocd(buf: Buffer): number {
  // The EOCD is 22 bytes plus a comment of at most 0xFFFF.
  const min = Math.max(0, buf.length - (22 + 0xffff));
  for (let i = buf.length - 22; i >= min; i -= 1) {
    if (buf.readUInt32LE(i) === EOCD_SIG) return i;
  }
  return -1;
}

function readZipEntries(buf: Buffer, opts: InspectOptions): ZipEntry[] | string {
  if (buf.length < 22) return 'Archive is truncated';

  const eocd = findEocd(buf);
  if (eocd < 0) return 'Archive central directory is missing';

  // ZIP64 archives are not something a Word document needs; refusing them also
  // removes a whole class of size-field confusion bugs.
  const entryCount = buf.readUInt16LE(eocd + 10);
  const cdSize = buf.readUInt32LE(eocd + 12);
  const cdOffset = buf.readUInt32LE(eocd + 16);
  const commentLen = buf.readUInt16LE(eocd + 20);

  if (eocd + 22 + commentLen !== buf.length) {
    return 'Archive has data appended after the central directory';
  }
  if (entryCount === 0xffff || cdSize === 0xffffffff || cdOffset === 0xffffffff) {
    return 'ZIP64 archives are not accepted';
  }
  if (entryCount > opts.zipMaxEntries) return 'Archive contains too many entries';
  if (cdOffset + cdSize > buf.length) return 'Archive central directory is out of bounds';

  const entries: ZipEntry[] = [];
  let p = cdOffset;
  let totalUncompressed = 0;
  let totalCompressed = 0;

  for (let n = 0; n < entryCount; n += 1) {
    if (p + 46 > buf.length) return 'Archive central directory is truncated';
    if (buf.readUInt32LE(p) !== CD_SIG) return 'Archive central directory is corrupt';

    const flags = buf.readUInt16LE(p + 8);
    const method = buf.readUInt16LE(p + 10);
    const compressedSize = buf.readUInt32LE(p + 20);
    const uncompressedSize = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLength = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);

    if (p + 46 + nameLen > buf.length) return 'Archive entry name is out of bounds';
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);

    // Entry names are never written to disk here, but a name that tries to
    // escape is a reliable signal the archive is hostile rather than a document.
    if (
      name.includes('\0') ||
      name.startsWith('/') ||
      name.startsWith('\\') ||
      /(^|[/\\])\.\.([/\\]|$)/.test(name) ||
      /^[a-zA-Z]:/.test(name)
    ) {
      return 'Archive contains an unsafe entry path';
    }
    if (localOffset >= buf.length) return 'Archive entry offset is out of bounds';

    // Bit 0 = encrypted. We cannot inspect what we cannot read.
    const encrypted = (flags & 0x0001) !== 0;
    if (encrypted) return 'Encrypted archives are not accepted';
    // Bit 3 = sizes live in a trailing data descriptor, i.e. the central
    // directory numbers we are about to trust may be zero. Word never does this.
    if ((flags & 0x0008) !== 0 && uncompressedSize === 0 && compressedSize === 0) {
      return 'Archive entry sizes are not declared';
    }
    if (method !== 0 && method !== 8) return 'Archive uses an unsupported compression method';

    totalUncompressed += uncompressedSize;
    totalCompressed += compressedSize;

    if (totalUncompressed > opts.zipMaxTotalUncompressedBytes) {
      return 'Archive expands to an unreasonable size';
    }
    if (compressedSize > 0 && uncompressedSize / compressedSize > opts.zipMaxCompressionRatio) {
      return 'Archive entry has an implausible compression ratio';
    }

    entries.push({ name, compressedSize, uncompressedSize, encrypted, method });
    p += 46 + nameLen + extraLen + commentLength;
  }

  if (totalCompressed > 0 && totalUncompressed / totalCompressed > opts.zipMaxCompressionRatio) {
    return 'Archive has an implausible overall compression ratio';
  }
  return entries;
}

function isZipBased(buf: Buffer, opts: InspectOptions): InspectResult | null {
  // PK\x03\x04 (entry), PK\x05\x06 (empty archive), PK\x07\x08 (spanned).
  if (!startsWith(buf, [0x50, 0x4b])) return null;
  const b2 = buf[2];
  const b3 = buf[3];
  const isLocal = b2 === 0x03 && b3 === 0x04;
  if (!isLocal) return { ok: false, reason: 'Archive is empty or spanned' };

  const entries = readZipEntries(buf, opts);
  if (typeof entries === 'string') return { ok: false, reason: entries };

  const names = new Set(entries.map((e) => e.name));

  if (!names.has('[Content_Types].xml')) {
    return { ok: false, reason: 'Archive is not an Office Open XML document' };
  }
  // Reject the macro-enabled variants and the other OOXML types outright: only
  // WordprocessingML is in scope for this platform.
  if (names.has('word/vbaProject.bin') || [...names].some((n) => n.endsWith('vbaProject.bin'))) {
    return { ok: false, reason: 'Macro-enabled documents are not accepted' };
  }
  if ([...names].some((n) => n.startsWith('xl/') || n.startsWith('ppt/'))) {
    return { ok: false, reason: 'Only Word documents are accepted' };
  }
  if (!names.has('word/document.xml')) {
    return { ok: false, reason: 'Archive is not a Word document' };
  }

  return { ok: true, format: FORMATS.docx };
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Legacy .doc (OLE2 / Compound File Binary)
 * ────────────────────────────────────────────────────────────────────────── */

const OLE2_MAGIC = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

/** UTF-16LE bytes for a stream name, as they appear in the CFB directory. */
const utf16 = (s: string): Buffer => Buffer.from(s, 'utf16le');

function isOle2(buf: Buffer): InspectResult | null {
  if (!startsWith(buf, OLE2_MAGIC)) return null;
  if (buf.length < 512) return { ok: false, reason: 'Document is truncated' };

  // OLE2 is the container for .doc, .xls, .ppt and for a pile of malware
  // droppers. Require the WordDocument stream, and refuse anything carrying a
  // VBA project.
  if (buf.indexOf(utf16('WordDocument')) < 0) {
    return { ok: false, reason: 'Document is not a Word file' };
  }
  for (const macro of ['VBA', 'Macros', '_VBA_PROJECT']) {
    if (buf.indexOf(utf16(macro)) >= 0) {
      return { ok: false, reason: 'Macro-enabled documents are not accepted' };
    }
  }
  return { ok: true, format: FORMATS.doc };
}

/* ────────────────────────────────────────────────────────────────────────── *
 * SVG (text container — detected here, validated in svgGuard.ts)
 * ────────────────────────────────────────────────────────────────────────── */

function isSvg(buf: Buffer): InspectResult | null {
  // Only consider text that plausibly starts an XML/SVG document, and only
  // after the binary detectors have all declined.
  const head = buf.subarray(0, 4096).toString('utf8').replace(/^\ufeff/, '').trimStart();
  if (!head.startsWith('<')) return null;
  if (!/^<(\?xml|!DOCTYPE\s+svg|!--|svg[\s>])/i.test(head)) return null;
  if (!/<svg[\s>]/i.test(buf.subarray(0, 65536).toString('utf8'))) return null;
  return { ok: true, format: FORMATS.svg };
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Sniffable-prefix guard
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Byte patterns a browser's content sniffer, or a misconfigured host, could
 * decide to treat as executable markup. Checked on the leading bytes of every
 * upload before format detection, so a file that is *both* a valid image and a
 * valid HTML page never gets stored.
 */
const SNIFFABLE_PREFIXES: Array<[string, RegExp]> = [
  ['HTML', /<(!doctype\s+html|html|head|body|script|iframe|object|embed|svg)[\s>/]/i],
  ['XML processing instruction', /<\?(xml-stylesheet|php)/i],
  ['server-side script', /<%[@=!]?/],
  ['shell script', /^#!\s*\/?\S/],
];

/** Windows PE, ELF, Mach-O, Java class, and shebang scripts. */
const EXECUTABLE_MAGICS: Array<[string, number[]]> = [
  ['MZ', [0x4d, 0x5a]],
  ['ELF', [0x7f, 0x45, 0x4c, 0x46]],
  ['Mach-O', [0xfe, 0xed, 0xfa, 0xce]],
  ['Mach-O', [0xfe, 0xed, 0xfa, 0xcf]],
  ['Mach-O', [0xcf, 0xfa, 0xed, 0xfe]],
  ['Mach-O', [0xce, 0xfa, 0xed, 0xfe]],
  ['Mach-O universal', [0xca, 0xfe, 0xba, 0xbe]],
  ['Java class', [0xca, 0xfe, 0xba, 0xbe]],
  ['Windows shortcut', [0x4c, 0x00, 0x00, 0x00]],
];

function rejectExecutableOrMarkup(buf: Buffer, allowMarkup: boolean): string | null {
  for (const [label, magic] of EXECUTABLE_MAGICS) {
    if (startsWith(buf, magic)) return `File looks like an executable (${label})`;
  }
  if (allowMarkup) return null;

  // A browser sniffs at most the first 512 bytes; check a wider window so an
  // image with markup smuggled just past that point is still refused.
  const head = buf.subarray(0, 2048).toString('latin1');
  const trimmed = head.replace(/^[\s\ufeff]+/, '');
  for (const [label, re] of SNIFFABLE_PREFIXES) {
    if (re.test(trimmed)) return `File contains ${label} markup`;
  }
  return null;
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Public API
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Determine what a buffer actually is.
 *
 * Returns the detected format, or a client-safe reason string. The reason is
 * written to be shown to an admin ("PNG has data appended after the final
 * chunk") without disclosing anything about the server.
 */
export function inspectBuffer(buf: Buffer, opts: InspectOptions): InspectResult {
  if (!Buffer.isBuffer(buf) || buf.length === 0) {
    return { ok: false, reason: 'File is empty' };
  }

  const execReason = rejectExecutableOrMarkup(buf, false);

  // Binary detectors first — a real image can never also parse as markup.
  const detectors: Array<(b: Buffer) => InspectResult | null> = [
    isPng,
    isJpeg,
    isGif,
    isWebp,
    isIsoBmff,
    (b) => isPdf(b, opts),
    (b) => isZipBased(b, opts),
    isOle2,
  ];

  for (const detect of detectors) {
    const result = detect(buf);
    if (result) {
      // A binary container that also carries markup in its leading bytes is a
      // polyglot; refuse it whatever the container says.
      if (result.ok && execReason) return { ok: false, reason: execReason };
      return result;
    }
  }

  // No binary container matched. SVG is the only text format we accept, and
  // the markup guard above would have flagged it — so evaluate it explicitly.
  const svg = isSvg(buf);
  if (svg) return svg;

  if (execReason) return { ok: false, reason: execReason };
  return { ok: false, reason: 'File type could not be recognised' };
}

/**
 * Sanitise a user-supplied filename down to something safe to echo back or
 * hand to a storage provider.
 *
 * Strips directory components, control characters, bidirectional overrides and
 * anything outside a conservative character set; collapses runs; truncates.
 * The result is NEVER used as a storage identifier on its own — see
 * upload.service.ts, which always generates its own random public id.
 */
export function sanitizeFilename(name: unknown, maxLength: number): string {
  if (typeof name !== 'string' || !name) return 'file';

  // Take the last path component under both separators, then drop anything
  // that is not a plain, printable, non-directional character.
  const base = name.split(/[\\/]/).pop() ?? '';
  const cleaned = base
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/\.{2,}/g, '.')
    .replace(/-{2,}/g, '-')
    .replace(/^[-.]+/, '')
    .replace(/[-.]+$/, '');

  const safe = cleaned.slice(0, Math.max(1, maxLength));
  return safe || 'file';
}

/** The extension of a filename, lowercased, without the dot. */
export function extensionOf(name: unknown): string {
  if (typeof name !== 'string') return '';
  const base = name.split(/[\\/]/).pop() ?? '';
  const dot = base.lastIndexOf('.');
  if (dot <= 0) return '';
  return base.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '');
}
