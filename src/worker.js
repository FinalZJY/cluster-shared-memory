const cluster = require('cluster');
const { v4: uuid4 } = require('uuid');

class Worker {
  constructor() {
    /**
     * Record the callback functions of requests.
     * @private
     */
    this.__getCallbacks__ = {};

    /**
     * Record the listeners' callback functions.
     * @private
     */
    this.__getListenerCallbacks__ = {};

    // Listen the returned messages from master processes.
    process.on('message', (data) => {
      // Mark this is a share memory.
      if (!data.isSharedMemoryMessage) return;
      if (data.isNotified) {
        const callback = this.__getListenerCallbacks__[data.uuid];
        if (callback && typeof callback === 'function') {
          callback(data.value);
        }
      } else {
        const callback = this.__getCallbacks__[data.uuid];
        if (callback && typeof callback === 'function') {
          callback(data.value);
        }
        delete this.__getCallbacks__[data.uuid];
      }
    });
  }

  /**
   * Write data.
   * @param {object} key
   * @param {*} value
   * @param {function?} callback
   */
  set(key, value, callback) {
    if (typeof callback === 'function') {
      this.handle('set', key, value, callback);
    }
    return new Promise((resolve) => {
      this.handle('set', key, value, () => {
        resolve();
      });
    });
  }

  /**
   * Read data.
   * @param {object} key
   * @param {function?} callback
   * @returns {*}
   */
  get(key, callback) {
    if (typeof callback === 'function') {
      this.handle('get', key, null, callback);
    }
    return new Promise((resolve) => {
      this.handle('get', key, null, (value) => {
        resolve(value);
      });
    });
  }

  /**
   * Remove data.
   * @param {object} key
   * @param {function?} callback
   */
  remove(key, callback) {
    if (typeof callback === 'function') {
      this.handle('remove', key, null, callback);
    }
    return new Promise((resolve) => {
      this.handle('remove', key, null, () => {
        resolve();
      });
    });
  }

  /**
   * Get the Lock of a object.
   * @param {object} key
   * @param {function?} callback
   * @returns {*}
   */
  getLock(key, callback) {
    if (typeof callback === 'function') {
      this.handle('getLock', key, null, callback);
    }
    return new Promise((resolve) => {
      this.handle('getLock', key, null, (value) => {
        resolve(value);
      });
    });
  }

  /**
   * Release the Lock of a object.
   * @param {object} key
   * @param {string} lockId
   * @param {function?} callback
   * @returns {*}
   */
  releaseLock(key, lockId, callback) {
    if (typeof callback === 'function') {
      this.handle('releaseLock', key, lockId, callback);
    }
    return new Promise((resolve) => {
      this.handle('releaseLock', key, lockId, (value) => {
        resolve(value);
      });
    });
  }

  /**
   * Auto get and release the Lock of a object.
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
   * Send the requests to the master process.
   * @private
   * @param {string} [method=set|get]
   * @param {object} key
   * @param {*} value
   * @param {function(data)} [callback] - the callback function
   */
  handle(method, key, value, callback) {
    const uuid = uuid4(); // 每次通信的uuid
    process.send({
      isSharedMemoryMessage: true,
      id: cluster.worker.id,
      method,
      uuid,
      key,
      value,
    });
    if (method === 'listen') {
      this.__getListenerCallbacks__[uuid] = callback;
    } else {
      this.__getCallbacks__[uuid] = callback;
    }
  }

  /**
   * Listen a object.
   * @param {object} key
   * @param {function?} callback
   * @returns {*}
   */
  listen(key, callback) {
    if (typeof callback === 'function') {
      this.handle('listen', key, null, callback);
    } else {
      throw new Error('a listener must have a callback.');
    }
  }

  /**
   * Read the LRU shared memory.
   * @param {object} key
   * @param {function?} callback
   */
  getLRU(key, callback) {
    if (typeof callback === 'function') {
      this.handle('getLRU', key, null, callback);
    }
    return new Promise((resolve) => {
      this.handle('getLRU', key, null, (value) => {
        resolve(value);
      });
    });
  }

  /**
   * Write the LRU shared memory.
   * @param {object} key
   * @param {*} value
   * @param {function?} callback
   */
  setLRU(key, value, callback) {
    if (typeof callback === 'function') {
      this.handle('setLRU', key, value, callback);
    }
    return new Promise((resolve) => {
      this.handle('setLRU', key, value, () => {
        resolve();
      });
    });
  }

  /**
   * Remove a object from the LRU shared memory.
   * @param {object} key
   * @param {function?} callback
   */
  removeLRU(key, callback) {
    if (typeof callback === 'function') {
      this.handle('removeLRU', key, null, callback);
    }
    return new Promise((resolve) => {
      this.handle('removeLRU', key, null, () => {
        resolve();
      });
    });
  }
}

module.exports = Worker;
