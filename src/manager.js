const cluster = require('cluster');
const { v4: uuid4 } = require('uuid');
const LRU = require('lru-cache');

class Manager {
  constructor() {
    // The shared memory is managed by the master process.
    this.__sharedMemory__ = {
      set(key, value) {
        this.memory[key] = value;
      },
      get(key) {
        return this.memory[key];
      },
      clear() {
        this.memory = {};
      },
      remove(key) {
        delete this.memory[key];
      },
      memory: {},
      locks: {},
      lockRequestQueues: {},
      listeners: {},
    };

    this.defaultLRUOptions = { max: 10000, maxAge: 1000 * 60 * 5 };

    this.__sharedLRUMemory__ = new LRU(this.defaultLRUOptions);

    this.logger = console.error;

    // Listen the messages from worker processes.
    cluster.on('online', (worker) => {
      worker.on('message', (data) => {
        if (!data.isSharedMemoryMessage) return;
        this.handle(data, worker);
        return false;
      });
    });
  }

  /**
   * recreate LRU cache
   * @param options
   */
  setLRUOptions(options) {
    this.__sharedLRUMemory__ = new LRU({
      ...this.defaultLRUOptions,
      ...options
    });
  }

  /**
   * handle the requests from worker processes.
   * @private
   * @param {object} data
   * @param {cluster.Worker} target
   */
  handle(data, target) {
    if (data.method === 'listen') {
      const listener = (value) => {
        if(target.isConnected()) {
          const msg = {
            isSharedMemoryMessage: true,
            isNotified: true,
            id: data.id, // worker id
            uuid: data.uuid,
            value,
          };
          target.send(msg, null, (error) => {
            if(error) {
              // Usually happens when the worker exit before the data is sent.
              this.logger(error);
            }
          });
        } else if (target.isDead()) {
          this.removeListener(data.key, listener);
        }
      };
      this.listen(data.key, listener);
    } else {
      const args = data.value ? [data.key, data.value] : [data.key];
      this[data.method](...args).then((value) => {
        const msg = {
          isSharedMemoryMessage: true,
          isNotified: false,
          id: data.id, // worker id
          uuid: data.uuid,
          value,
        };
        target.send(msg, null, (error) => {
          if(error) {
            // Usually happens when the worker exit before the data is sent.
            this.logger(error);
          }
        });
      });
    }
  }

  /**
   * @private
   */
  notifyListener(key) {
    const listeners = this.__sharedMemory__.listeners[key];
    if (listeners?.length > 0) {
      Promise.all(
        listeners.map(
          (callback) =>
            new Promise((resolve) => {
              callback(this.__sharedMemory__.get(key));
              resolve();
            })
        )
      );
    }
  }

  /**
   * Write the shared memory.
   * @param {object} key
   * @param {*} value
   * @param {function?} callback
   */
  set(key, value, callback) {
    if (key) {
      if (typeof callback === 'function') {
        this.__sharedMemory__.set(key, value);
        this.notifyListener(key);
        callback('OK');
      }
      return new Promise((resolve) => {
        this.__sharedMemory__.set(key, value);
        this.notifyListener(key);
        resolve('OK');
      });
    }
  }

  /**
   * Read the shared memory.
   * @param {object} key
   * @param {function?} callback
   */
  get(key, callback) {
    if (typeof callback === 'function') {
      callback(this.__sharedMemory__.get(key));
    }
    return new Promise((resolve) => {
      resolve(this.__sharedMemory__.get(key));
    });
  }

  /**
   * Remove an object from the shared memory.
   * @param {object} key
   * @param {function?} callback
   */
  remove(key, callback) {
    if (typeof callback === 'function') {
      this.__sharedMemory__.remove(key);
      this.notifyListener(key);
      callback('OK');
    }
    return new Promise((resolve) => {
      this.__sharedMemory__.remove(key);
      this.notifyListener(key);
      resolve('OK');
    });
  }

  /**
   * Get the Lock of an object.
   * @param {object} key
   * @param {function?} callback
   * @returns {*}
   */
  getLock(key, callback) {
    if (typeof callback === 'function') {
      this.__sharedMemory__.lockRequestQueues[key] =
        this.__sharedMemory__.lockRequestQueues[key] ?? [];
      this.__sharedMemory__.lockRequestQueues[key].push(callback);
      this.handleLockRequest(key);
    }
    return new Promise((resolve) => {
      this.__sharedMemory__.lockRequestQueues[key] =
        this.__sharedMemory__.lockRequestQueues[key] ?? [];
      this.__sharedMemory__.lockRequestQueues[key].push(resolve);
      this.handleLockRequest(key);
    });
  }

  /**
   * Release the Lock of an object.
   * @param {object} key
   * @param {string} lockId
   * @param {function?} callback
   * @returns {*}
   */
  releaseLock(key, lockId, callback) {
    if (typeof callback === 'function') {
      if (lockId === this.__sharedMemory__.locks[key]) {
        delete this.__sharedMemory__.locks[key];
        this.handleLockRequest(key);
        callback('OK');
      } else {
        callback(`Failed. LockId:${lockId} does not match ${key}'s lockId.`);
      }
    }
    return new Promise((resolve) => {
      if (lockId === this.__sharedMemory__.locks[key]) {
        delete this.__sharedMemory__.locks[key];
        this.handleLockRequest(key);
        resolve('OK');
      } else {
        resolve(`Failed. LockId:${lockId} does not match ${key}'s lockId.`);
      }
    });
  }

  /**
   * Auto get and release the Lock of an object.
   * @param {object} key
   * @param {function?} func
   * @returns {*}
   */
  mutex(key, func) {
    return (async () => {
      const lockId = await this.getLock(key);
      const result = await func();
      await this.releaseLock(key, lockId);
      return result;
    })();
  }

  /**
   * @private
   */
  handleLockRequest(key) {
    return new Promise((resolve) => {
      if (
        !this.__sharedMemory__.locks[key] &&
        this.__sharedMemory__.lockRequestQueues[key]?.length > 0
      ) {
        const callback = this.__sharedMemory__.lockRequestQueues[key].shift();
        const lockId = uuid4();
        this.__sharedMemory__.locks[key] = lockId;
        callback(lockId);
      }
      resolve();
    });
  }

  /**
   * Listen an object.
   * @param {object} key
   * @param {function} callback
   * @returns {*}
   */
  listen(key, callback) {
    if (typeof callback === 'function') {
      this.__sharedMemory__.listeners[key] =
        this.__sharedMemory__.listeners[key] ?? [];
      this.__sharedMemory__.listeners[key].push(callback);
    } else {
      throw new Error('a listener must have a callback.');
    }
  }

  /**
   * Remove a listener of an object.
   * @private
   * @param {object} key
   * @param {function} listener
   */
  removeListener(key, listener) {
    const index = (this.__sharedMemory__.listeners[key] ?? []).indexOf(listener);
    if(index >= 0) {
      this.__sharedMemory__.listeners[key].splice(index, 1);
    }
  }

  /**
   * Read the LRU shared memory.
   * @param {object} key
   * @param {function?} callback
   */
  getLRU(key, callback) {
    if (typeof callback === 'function') {
      callback(this.__sharedLRUMemory__.get(key));
    }
    return new Promise((resolve) => {
      resolve(this.__sharedLRUMemory__.get(key));
    });
  }

  /**
   * Write the LRU shared memory.
   * @param {object} key
   * @param {*} value
   * @param {function?} callback
   */
  setLRU(key, value, callback) {
    if (key) {
      if (typeof callback === 'function') {
        this.__sharedLRUMemory__.set(key, value);
        callback('OK');
      }
      return new Promise((resolve) => {
        this.__sharedLRUMemory__.set(key, value);
        resolve('OK');
      });
    }
  }

  /**
   * Remove an object from the LRU shared memory.
   * @param {object} key
   * @param {function?} callback
   */
  removeLRU(key, callback) {
    if (typeof callback === 'function') {
      this.__sharedLRUMemory__.del(key);
      callback('OK');
    }
    return new Promise((resolve) => {
      this.__sharedLRUMemory__.del(key);
      resolve('OK');
    });
  }
}

module.exports = Manager;
