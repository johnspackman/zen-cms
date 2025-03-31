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

qx.Class.define("zx.server.work.pools.NodeThreadWorkerTracker", {
  extend: zx.server.work.WorkerTracker,

  construct(workerPool, nodeThread) {
    super(workerPool, null);
    this.__nodeThread = nodeThread;
  },

  members: {
    /** @type{import("node:worker_threads").Worker} */
    __nodeThread: null,

    /**
     * @Override
     */
    async initialize() {
      this.__nodeThread.on("error", err => {
        this.debug("Node Worker error: " + err);
        if (this.getStatus() == "running") {
          this.appendWorkLog(err);
        }
      });
      this.__nodeThread.on("exit", code => {
        this.error(`Worker stopped with exit code ${code}`);
        if (this.getStatus() == "running") {
          this.appendWorkLog(`Worker stopped with exit code ${code}`);
        }
        this.setStatus("dead");
      });

      this.__apiClientTransport = new zx.io.api.transport.nodeworker.NodeWorkerClientTransport();
      await this.__apiClientTransport.connect(this.__nodeThread);

      let workerClientApi = zx.io.api.ApiUtils.createClientApi(zx.server.work.IWorkerApi, this.__apiClientTransport, "/work/worker");
      this._setWorkerClientApi(workerClientApi);
      await super.initialize();
      if (this.getWorkerPool().isEnableChromium()) {
        await this._createDockerConfiguration("this-process", this.getWorkerPool().getNodeInspect());
        await this.getDockerContainer();
      }
    },

    async close() {
      if (!this.__nodeThread) {
        this.debug("Node thread already terminated");
        return;
      }
      let clientApi = this.getWorkerClientApi();
      let timedWaitFor = new zx.utils.TimedWaitFor(5000);
      this.__nodeThread.once("exit", () => {
        this.debug(`Node thread terminated`);
        timedWaitFor.fire();
      });
      try {
        await clientApi.shutdown();
      } catch (ex) {
        // Shutdown will reject the method call, so this is actually expected
        this.trace(`Expected exception while shutting down worker: ${ex}`);
      }
      await timedWaitFor.wait();
      clientApi.terminate();
      await this._closeContainer();
      this.__nodeThread.terminate();
      this.__nodeThread = null;
    },

    /**
     * @Override
     */
    appendWorkLog(message) {
      super.appendWorkLog(message);
      if (!this.getWorkResult()) {
        this.info(message);
      }
    }
  }
});
