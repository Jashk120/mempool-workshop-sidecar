/**
 * Local-test shim for @farcaster/rocksdb, which has no Windows prebuild.
 * Implements the subset the P2P LevelDatastore uses. Not durable.
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
  }): AsyncIterable<[string, unknown]> {
    const gte = opts.gte ?? "";
    const lt = opts.lt ?? "\uffff";
    for (const [key, raw] of this.store.entries()) {
      if (key < gte || key >= lt) continue;
      let value: unknown = raw;
      try {
        value = JSON.parse(raw);
      } catch {
        // keep raw
      }
      yield [key, value];
    }
  }
}

export function createMemoryDb(dir: string): MemoryDb {
  return new MemoryDb(dir);
}
