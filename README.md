# cluster-shared-memory
![npm](https://img.shields.io/npm/v/cluster-shared-memory)
![node-current](https://img.shields.io/node/v/cluster-shared-memory)
![GitHub repo size](https://img.shields.io/github/repo-size/FinalZJY/cluster-shared-memory)

Cross-process storage acts like shared memory for Node.js applications which use
the cluster module.

If you are looking for a tool to share the physical memory, cluster-shared-memory
can not meet your needs. You can only use it to share data between processes.

It provides in-memory storage managed by the master process, and 
the workers communicate with the master through IPC. It's basically used in 
the Node.js cluster applications to share data between processes.

It supports reading and writing objects in shared memory storage, mutually 
exclusive access between processes, listening objects in shared memory storage, 
and an LRU cache.

## Install
```shell
npm i cluster-shared-memory
```

## Usage
```javascript
const cluster = require('cluster');
require('cluster-shared-memory');

if (cluster.isMaster) {
  for (let i = 0; i < 2; i++) {
    cluster.fork();
  }
} else {
  const sharedMemoryController = require('cluster-shared-memory');
  // Note: it must be a serializable object
  const obj = {
    name: 'Tom',
    age: 10,
  };
  // Set an object
  await sharedMemoryController.set('myObj', obj);
  // Get an object
  const myObj = await sharedMemoryController.get('myObj');
  // Mutually exclusive access
  await sharedMemoryController.mutex('myObj', async () => {
    const newObj = await sharedMemoryController.get('myObj');
    newObj.age = newObj.age + 1;
    await sharedMemoryController.set('myObj', newObj);
  });
}
```

## API

### setLRUOptions(options)
Set the options of the LRU cache. Only available on the master process.

**Note that this will recreate a new LRU cache.**

- **options** {Object} The same with the options of 
  [lru-cache](https://github.com/isaacs/node-lru-cache).
    - _default_ : `{ max: 10000, maxAge: 1000 * 60 * 5 }`.
- **returnValue** {void} 

### set(key, value, [callback])
Set an object to the shared memory storage.

- **key** {String} The key used to find the object.
- **value** {any} The object to set. Note: it must be a serializable object.
- **callback** {Function} (optional) The function to be called after 
  successful operations. Callback arguments:
    - _result_ {String}: 'OK' if success.
- **returnValue** {Promise\<String\> | void} This function is an async function. 
  It will return a Promise if there's no callback function.

### get(key, [callback])
Get an object from the shared memory storage.

- **key** {String} The key used to find the object.
- **callback** {Function} (optional) The function to be called after
  successful operations. Callback arguments:
    - _value_ {any}: The Object to get.
- **returnValue** {Promise\<any\> | void} This function is an async function.
  It will return a Promise if there's no callback function.

### remove(key, [callback])
Remove an object from the shared memory storage.

- **key** {String} The key used to find the object.
- **callback** {Function} (optional) The function to be called after
  successful operations. Callback arguments:
    - _result_ {String}: 'OK' if success.
- **returnValue** {Promise\<String\> | void} This function is an async function.
  It will return a Promise if there's no callback function.

### getLock(key, [callback])
Get the lock of an object. If you want to perform mutually exclusive 
operations, you must get the lock first. If the lock is already get 
by another process, this operation will be blocked until the lock has 
been returned.

**Remember to release the lock after you finishing the operations!**

- **key** {String} The key used to find the object.
- **callback** {Function} (optional) The function to be called after
  successful operations. Callback arguments:
    - _lockId_ {String}: The ID of the lock.
- **returnValue** {Promise\<String\> | void} This function is an async function.
  It will return a Promise if there's no callback function.

### releaseLock(key, lockId, [callback])
Release the lock of an object. After releasing the lock, one of other 
blocked requests can get the lock.

- **key** {String} The key used to find the object.
- **lockId** {String} The ID of the lock.
- **callback** {Function} (optional) The function to be called after
  successful operations. Callback arguments:
    - _result_ {String}: 'OK' if success.
- **returnValue** {Promise\<String\> | void} This function is an async function.
  It will return a Promise if there's no callback function.

### mutex(key, func)
Auto get and release the Lock of an object.

- **key** {String} The key used to find the object.
- **func** {Function} The async function to be called after getting the lock. 
  It will hold the lock before the function is finished. 
- **returnValue** {Promise\<any\>} This function is an async function.
  It will return a Promise, which the resolved value is the same as func.

### listen(key, callback)
Listen an object.

- **key** {String} The key used to find the object.
- **callback** {Function} The function to be called after the value 
  of the object is changed. Callback arguments:
    - _value_ {any}: The new value of the Object.
- **returnValue** {void} 

### setLRU(key, value, [callback])
Set an object to the LRU cache.

- **key** {String} The key used to find the object.
- **value** {any} The object to set. Note: it must be a serializable object.
- **callback** {Function} (optional) The function to be called after
  successful operations. Callback arguments:
  - _result_ {String}: 'OK' if success.
- **returnValue** {Promise\<String\> | void} This function is an async function.
  It will return a Promise if there's no callback function.

### getLRU(key, [callback])
Get an object from the LRU cache.

- **key** {String} The key used to find the object.
- **callback** {Function} (optional) The function to be called after
  successful operations. Callback arguments:
  - _value_ {any}: The Object to get.
- **returnValue** {Promise\<any\> | void} This function is an async function.
  It will return a Promise if there's no callback function.

### removeLRU(key, [callback])
Remove an object from the LRU cache.

- **key** {String} The key used to find the object.
- **callback** {Function} (optional) The function to be called after
  successful operations. Callback arguments:
  - _result_ {String}: 'OK' if success.
- **returnValue** {Promise\<String\> | void} This function is an async function.
  It will return a Promise if there's no callback function.

