/* ************************************************************************
 *
 *  Zen [and the art of] CMS
 *
 *  https://zenesis.com
 *
 *  Copyright:
 *    2019-2025 Zenesis Ltd, https://www.zenesis.com
 *
 *  License:
 *    MIT (see LICENSE in project root)
 *
 *  Authors:
 *    John Spackman (@johnspackman)
 *    Will Johnson (@willsterjohnsonatzenesis)
 *
 * ************************************************************************ */
const { Worker } = require("node:worker_threads");

/**
 * The node worker pool runs work in a node worker thread
 */
qx.Class.define("zx.server.work.pools.NodeThreadWorkerPool", {
  /** @template {import('node:worker_threads').Worker} TWorker */
  extend: zx.server.work.pools.WorkerPool,

  /**
   * @param {string?} workdir - working directory for the pool
   * @param {string} remoteAppPath - the path on disk to the compiled entrypoint for the remote worker app.
   */
  construct(workdir, remoteAppPath) {
    super(workdir);
    this.__remoteAppPath = remoteAppPath;
  },

  members: {
    /**
     * @override
     */
    async createPoolableEntity() {
      this.debug(`Creating new NodeThreadWorkerTracker using ${this.__remoteAppPath}`);
      let nodeThread = new Worker(this.__remoteAppPath, {
        workerData: {
          classname: "zx.server.work.runtime.NodeWorkerService"
        }
      });

      let workerTracker = new zx.server.work.pools.NodeThreadWorkerTracker(this, nodeThread);
      await workerTracker.initialize();
      return workerTracker;
    }
  }
});
