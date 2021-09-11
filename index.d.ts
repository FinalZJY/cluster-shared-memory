import ChildProcess = require("child_process");

declare class SharedMemory {
  constructor();

  /**
   * Read data.
   */
  get<V extends SharedMemory.Value>(
    key: SharedMemory.Key,
    callback?: (value: V) => void
  ): Promise<V>;

  /**
   * Write data.
   */
  set(
    key: SharedMemory.Key,
    value: SharedMemory.Value,
    callback?: (value: "OK") => void
  ): Promise<"OK">; // Manager
  set(
    key: SharedMemory.Key,
    value: SharedMemory.Value,
    callback?: (value: "OK") => void
  ): Promise<void>; // Worker

  /**
   * Remove data.
   */
  remove(
    key: SharedMemory.Key,
    callback?: (value: "OK") => void
  ): Promise<"OK">; // Manager
  remove(
    key: SharedMemory.Key,
    callback?: (value: "OK") => void
  ): Promise<void>; // Worker

  /**
   * Get the Lock of an object.
   */
  getLock(
    key: SharedMemory.Key,
    callback?: (value: string) => void
  ): Promise<string>;

  /**
   * Release the Lock of an object.
   */
  releaseLock(
    key: SharedMemory.Key,
    lockId: string,
    callback?: (value: "OK") => void
  ): Promise<"OK">;

  /**
   * Auto get and release the Lock of an object.
   */
  mutex<R>(key: SharedMemory.Key, func: () => R | PromiseLike<R>): Promise<R>;

  /**
   * Listen an object.
   */
  listen<V extends SharedMemory.Value>(
    key: SharedMemory.Key,
    callback: (value: V) => void
  ): void;

  /**
   * Read the LRU shared memory.
   */
  getLRU<V extends SharedMemory.Value>(
    key: SharedMemory.Key,
    callback?: (value: V) => void
  ): Promise<V>;

  /**
   * Write the LRU shared memory.
   */
  setLRU(
    key: SharedMemory.Key,
    value: SharedMemory.Value,
    callback?: (value: "OK") => void
  ): Promise<"OK">; // Manager
  setLRU(
    key: SharedMemory.Key,
    value: SharedMemory.Value,
    callback?: (value: "OK") => void
  ): Promise<void>; // Worker

  /**
   * Remove an object from the LRU shared memory.
   */
  removeLRU(
    key: SharedMemory.Key,
    callback?: (value: "OK") => void
  ): Promise<"OK">; // Manager
  removeLRU(
    key: SharedMemory.Key,
    callback?: (value: "OK") => void
  ): Promise<void>; // Worker
}

declare const sharedMemoryController = new SharedMemory();

declare namespace SharedMemory {
  type Key = string | number;
  type Value = ChildProcess.Serializable;
}

export = sharedMemoryController;
