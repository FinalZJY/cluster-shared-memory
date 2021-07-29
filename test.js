const cluster = require('cluster');
const http = require('http');
const port = Number(process.env.PORT) || 3080;

if (cluster.isMaster) {
  const setRequestTimesToZero = async () => {
    const sharedMemoryController = require('./src/shared-memory');
    sharedMemoryController.setLRUOptions({
      max: 10,
      maxAge: 1000,
    })
    await sharedMemoryController.set('requestTimes', 0);
  }

  setRequestTimesToZero().then(() => {
    const numCPUs = require('os').cpus().length;
    const numWorkers = Math.max(numCPUs, 1);
    for (let i = 0; i < numWorkers; i++) {
      cluster.fork({
        PORT: port,
      });
    }
  });
} else {
  const hostIp = 'localhost';
  const baseUrl = '/';
  const server = http.createServer(async (req, res) => {
    if (req.url === '/') {
      const sharedMemoryController = require('./src/shared-memory');

      let requestTimes;
      await sharedMemoryController.mutex('requestTimes', async () => {
        requestTimes = (await sharedMemoryController.get('requestTimes')) + 1;
        await sharedMemoryController.set('requestTimes', requestTimes);
      });

      res.writeHead(200);
      res.end(`requestTimes: ${requestTimes}\n`);
    } else {
      res.writeHead(200);
      res.end(`Note: this url will not count requestTimes.\n`);
    }
  }).listen(port, hostIp, function () {
    const url = `http://${hostIp}:${port}${baseUrl}`;
    console.log(`Worker ${cluster.worker.id}: HTTP server up! Visit ${url} to get started`);
  });
}
