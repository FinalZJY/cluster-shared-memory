const cluster = require('cluster');
const Manager = require('./manager');
const Worker = require('./worker');

/**
 * Cross-process shared memory for node.js cluster module, implemented using node.js IPC.
 *
 * The shared memory is managed by the master process, and the worker processes reads and
 * writes the shared memory by requesting the master process.
 *
 * Since IPC needs to serialize and deserialize the transmitted json data, it is not recommend
 * to write large objects to the shared memory which will cause too much CPU usage.
 *
 * There is no automatic memory cleaning, please remember to remove the useless objects in
 * the shared memory to prevent memory overflow.
 */
class SharedMemory {
  constructor() {
    if (cluster.isMaster || cluster.isPrimary) {
      return new Manager();
    } else {
      return new Worker();
    }
  }
}

const sharedMemoryController = new SharedMemory();

module.exports = sharedMemoryController;
