/**
 * This API provides a REST API for communicating with a Worker Pool
 * and getting status information about it.
 */
qx.Class.define("zx.server.work.pools.WorkerPoolServerApi", {
  extend: zx.io.api.server.AbstractServerApi,

  /**
   * @param {zx.server.work.pools.WorkerPool} workerPool
   */
  construct(workerPool) {
    super("zx.server.work.api.WorkerPoolApi");
    this.__workerPool = workerPool;

    this._registerGet("shutdown", () => this.__workerPool.shutdown());
    this._registerGet("kill/{uuid}", (req, res) => this.__workerPool.killWork(req.getPathArgs().uuid));
    this._registerGet("worker-status/{uuid}", (req, res) => this.__workerPool.getWorkerStatusJson(req.getPathArgs().uuid));
    this._registerGet("status", (req, res) => this.__workerPool.getStatusJson());
  },

  members: {
    /**
     * @type {zx.server.work.pools.WorkerPool}
     */
    __workerPool: null
  }
});
