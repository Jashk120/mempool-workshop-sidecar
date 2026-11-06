/**
 * Local-test shim for @farcaster/rocksdb, which has no Windows prebuild.
 * Implements only the subset RocksDbController uses. Not durable, not for
 * production - this exists so the sidecar can be run and tested on Windows.
 */
type ErrCb = (err: Error | null) => void;

function notFound(key: string): Error {
  return Object.assign(new Error(`NotFound: ${key}`), {
    code: "LEVEL_NOT_FOUND",
    notFound: true,
  });
}

export class MemoryDb {
  private store = new Map<string, string>();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_dir: string) {}

  open(cb: ErrCb): void;
  open(_opts: unknown, cb: ErrCb): void;
  open(optsOrCb: unknown, maybeCb?: ErrCb): void {
    const cb = (typeof optsOrCb === "function" ? optsOrCb : maybeCb) as ErrCb;
    cb(null);
  }

  close(cb: ErrCb): void {
    cb(null);
  }

  batch(ops: any[], cb: ErrCb): void {
    for (const op of ops) {
      if (op.type === "put") this.store.set(op.key, JSON.stringify(op.value));
      else this.store.delete(op.key);
    }
    cb(null);
  }

  async *iterator(opts: {
    gte?: string;
    lt?: string;
    keys?: boolean;
    values?: boolean;
  }): AsyncIterable<[string, unknown]> {
    const gte = opts.gte ?? "";
    const lt = opts.lt ?? "\uffff";
    for (const [key, raw] of this.store.entries()) {
      if (key < gte || key >= lt) continue;
      let value: unknown = raw;
      try {
        value = JSON.parse(raw);
      } catch {
        // keep the raw string
      }
      yield [key, value];
    }
  }

  get(key: string, cb: (err: Error | null, value: string) => void): void {
    const value = this.store.get(key);
    if (value === undefined) return cb(notFound(key), "");
    cb(null, value);
  }

  put(key: string, value: string, cb: ErrCb): void {
    this.store.set(key, value);
    cb(null);
  }

  del(key: string, cb: ErrCb): void {
    this.store.delete(key);
    cb(null);
  }

  getMany(
    keys: string[],
    cb: (err: Error | null, values: string[]) => void
  ): void {
    cb(
      null,
      keys.map((key) => this.store.get(key) ?? "null")
    );
  }
}

export default function createMemoryDb(dir: string): MemoryDb {
  return new MemoryDb(dir);
}

export { createMemoryDb };
