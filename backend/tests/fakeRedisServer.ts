/**
 * A minimal RESP server: just enough Redis for ioredis to connect and for the
 * rate-limit store to run its real code path against.
 *
 * Implemented rather than mocked because the module exports are esbuild
 * getters — non-writable — so the only way to exercise the production Redis
 * path is to give it something that actually speaks the protocol.
 */
import net from 'net';

interface Entry { value: number; expiresAt: number }

export class FakeRedisServer {
  private store = new Map<string, Entry>();
  private server: net.Server;
  private sockets = new Set<net.Socket>();
  /** Flip to make every command fail, simulating an outage. */
  public failing = false;
  public commandLog: string[] = [];
  public receivedKeys: Array<{ cmd: string; key: string }> = [];
  public port = 0;

  constructor() {
    this.server = net.createServer((socket) => this.handle(socket));
  }

  async listen(): Promise<number> {
    await new Promise<void>((r) => this.server.listen(0, '127.0.0.1', r));
    this.port = (this.server.address() as net.AddressInfo).port;
    return this.port;
  }

  /** Destroy live sockets too: a lingering one keeps the test runner alive. */
  close(): void {
    for (const socket of this.sockets) socket.destroy();
    this.sockets.clear();
    this.server.close();
  }

  /** Snapshot of live keys, for assertions about key shape. */
  keys(): string[] {
    const now = Date.now();
    return [...this.store.entries()].filter(([, e]) => e.expiresAt > now).map(([k]) => k);
  }

  private live(key: string): Entry | undefined {
    const e = this.store.get(key);
    if (!e) return undefined;
    if (e.expiresAt <= Date.now()) { this.store.delete(key); return undefined; }
    return e;
  }

  private handle(socket: net.Socket): void {
    this.sockets.add(socket);
    socket.on("close", () => this.sockets.delete(socket));
    let buffer = Buffer.alloc(0);
    socket.on('error', () => undefined);
    socket.on('data', (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      for (;;) {
        const parsed = parseCommand(buffer);
        if (!parsed) break;
        buffer = buffer.subarray(parsed.consumed);
        socket.write(this.run(parsed.args));
      }
    });
  }

  private run(args: string[]): string {
    const cmd = (args[0] ?? '').toUpperCase();
    this.commandLog.push(cmd);
    if (cmd === 'EVAL') this.receivedKeys.push({ cmd, key: args[3] });
    else if (['GET','DEL','DECR','PTTL'].includes(cmd)) this.receivedKeys.push({ cmd, key: args[1] });

    if (this.failing && cmd !== 'INFO' && cmd !== 'PING') return '-ERR redis is down\r\n';

    switch (cmd) {
      case 'INFO':
        return bulk('redis_version:7.0.11\r\nredis_mode:standalone\r\nrole:master\r\n');
      case 'PING':
        return '+PONG\r\n';
      case 'CLIENT':
      case 'SELECT':
      case 'SUBSCRIBE':
        return '+OK\r\n';
      case 'EVAL':
        return this.evalIncrement(args);
      case 'GET': {
        const e = this.live(args[1]);
        return e ? bulk(String(e.value)) : '$-1\r\n';
      }
      case 'DECR': {
        const e = this.live(args[1]);
        if (!e) return ':0\r\n';
        e.value -= 1;
        return `:${e.value}\r\n`;
      }
      case 'DEL':
        return `:${this.store.delete(args[1]) ? 1 : 0}\r\n`;
      case 'PTTL': {
        const e = this.live(args[1]);
        return `:${e ? Math.max(0, e.expiresAt - Date.now()) : -2}\r\n`;
      }
      case 'QUIT':
        return '+OK\r\n';
      default:
        return '+OK\r\n';
    }
  }

  /**
   * The store's only script is INCREMENT_SCRIPT: INCR, set the TTL on first
   * use, return [count, ttl]. Implemented directly rather than by running Lua.
   */
  private evalIncrement(args: string[]): string {
    const key = args[3];
    const ttl = Number(args[4]);
    const existing = this.live(key);
    if (!existing) {
      this.store.set(key, { value: 1, expiresAt: Date.now() + ttl });
      return `*2\r\n:1\r\n:${ttl}\r\n`;
    }
    existing.value += 1;
    const remaining = Math.max(0, existing.expiresAt - Date.now());
    return `*2\r\n:${existing.value}\r\n:${remaining}\r\n`;
  }
}

const bulk = (s: string): string => `$${Buffer.byteLength(s)}\r\n${s}\r\n`;

/** Parse one RESP array command. Returns null if the buffer is incomplete. */
function parseCommand(buf: Buffer): { args: string[]; consumed: number } | null {
  if (buf.length === 0) return null;
  if (buf[0] !== 0x2a) {
    // Inline command (used by some handshakes): read to CRLF.
    const end = buf.indexOf('\r\n');
    if (end < 0) return null;
    return { args: buf.subarray(0, end).toString().split(/\s+/).filter(Boolean), consumed: end + 2 };
  }

  let offset = 0;
  const readLine = (): string | null => {
    const end = buf.indexOf('\r\n', offset);
    if (end < 0) return null;
    const line = buf.subarray(offset, end).toString('latin1');
    offset = end + 2;
    return line;
  };

  const header = readLine();
  if (header === null) return null;
  const count = Number(header.slice(1));
  if (!Number.isFinite(count) || count < 0) return null;

  const args: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const lenLine = readLine();
    if (lenLine === null) return null;
    const len = Number(lenLine.slice(1));
    if (offset + len + 2 > buf.length) return null;
    args.push(buf.subarray(offset, offset + len).toString('latin1'));
    offset += len + 2;
  }
  return { args, consumed: offset };
}
