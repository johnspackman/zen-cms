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
 *    John Spackman (john.spackman@zenesis.com, @johnspackman)
 *
 * ************************************************************************ */

qx.Class.define("zx.server.work.pools.LocalWorkerTracker", {
  extend: zx.server.work.WorkerTracker,

  construct(workerPool, worker, workerClientApi) {
    super(workerPool, workerClientApi);
    this.__worker = worker;
  },

  members: {
    /** @type {zx.server.work.Worker} */
    __worker: null,

    /** @type {zx.server.work.IWorkerApi} */
    __workerServerApi: null,

    /**
     * @Override
     */
    async initialize() {
      await super.initialize();
      if (this.getWorkerPool().isEnableChromium()) {
        await this._createDockerConfiguration("this-process", this.getWorkerPool().getNodeInspect());
        await this.getDockerContainer();
      }
    },

    /**
     * @Override
     */
    appendWorkLog(message) {
      super.appendWorkLog(message);
      if (!this.getWorkResult()) {
        this.info(message);
      }
    },

    /**
     * Kills the node process
     */
    async close() {
      await super.close();
      if (this.__worker) {
        this.__worker.dispose();
        this.__worker = null;
      }
    }
  }
});
