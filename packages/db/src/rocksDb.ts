import path from "node:path";
import { createRequire } from "node:module";
import { MemoryDb, createMemoryDb } from "./memoryDb.js";
// eslint-disable-next-line import/no-extraneous-dependencies
import { IDbController } from "@skandha/types/lib/index.js";
import { replaceBigints, reviveBigints } from "./bigintJson.js";

const require = createRequire(import.meta.url);

enum Status {
  started = "started",
  stopped = "stopped",
}

export class RocksDbController implements IDbController {
  private namespace: string;
  private db: MemoryDb;
  private status = Status.stopped;

  constructor(dbDir: string, namespace: string) {
    const dir = path.resolve(dbDir, namespace);
    if (process.platform === "win32") {
      // @farcaster/rocksdb has no Windows prebuild, so local runs use the
      // in-memory shim. Linux (including the Docker image) stays on RocksDB.
      this.db = createMemoryDb(dir);
    } else {
      // Load lazily: the native addon cannot even be required on Windows.
      const rocks = require("@farcaster/rocksdb");
      const factory = typeof rocks === "function" ? rocks : rocks.default;
      this.db = factory(dir) as MemoryDb;
    }
    this.namespace = namespace;
  }

  get<T>(key: string): Promise<T> {
    key = `${this.namespace}:${key}`;
    return new Promise((resolve, reject) => {
      this.db.get(key, (err, value) => {
        if (err) {
          return reject(err);
        }
        try {
          resolve(JSON.parse(value as string, reviveBigints));
        } catch (_) {
          return resolve(value as T);
        }
      });
    });
  }

  // eslint-disable-next-line @typescript-eslint/ban-types
  put(key: string, value: Object): Promise<void> {
    key = `${this.namespace}:${key}`;
    return new Promise((resolve, reject) => {
      this.db.put(
        key,
        JSON.stringify(value, replaceBigints),
        (err) => {
          if (err) {
            return reject(err);
          }
          resolve();
        }
      );
    });
  }

  del(key: string): Promise<void> {
    key = `${this.namespace}:${key}`;
    return new Promise((resolve, reject) => {
      this.db.del(key, (err) => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  }

  getMany<T>(keys: string[]): Promise<T[]> {
    keys = keys.map((key) => `${this.namespace}:${key}`);
    return new Promise((resolve, reject) => {
      this.db.getMany(keys, (err, values) => {
        if (err) {
          return reject(err);
        }
        try {
          resolve(
            values.map((value) => JSON.parse(value as string, reviveBigints))
          );
        } catch (_) {
          return reject(values as T[]);
        }
      });
    });
  }

  async start(): Promise<void> {
    if (this.status === Status.started) return;
    this.status = Status.started;
    this.db.open((err) => {
      if (err) throw Error("Unable to start database " + err);
    });
  }

  async stop(): Promise<void> {
    if (this.status === Status.stopped) return;
    this.status = Status.stopped;

    this.db.close((err) => {
      if (err) {
        throw Error("Unable to stop database " + err);
      }
    });
  }
}
