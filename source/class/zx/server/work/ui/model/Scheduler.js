/**
 * Class for a proxy representing a work scheduler.
 */
qx.Class.define("zx.server.work.ui.model.Scheduler", {
  extend: qx.core.Object,
  /**
   *
   * @param {zx.io.api.client.AbstractClientTransport} transport
   * @param {string} apiPath
   */
  construct(transport, apiPath) {
    super();

    this.__api = zx.io.api.ApiUtils.createClientApi(zx.server.work.scheduler.ISchedulerApi, transport, apiPath);
    this.__transport = transport;
  },
  properties: {
    /**
     * @readonly
     * Currently, there is only one scheduler, so we're gonna call it "Queue Scheduler" for now.
     */
    title: {
      check: "String",
      init: "Queue Scheduler",
      event: "changeTitle"
    }
  },
  members: {
    /**
     * @type {zx.server.work.scheduler.ISchedulerApi}
     */
    __api: null,
    /**
     * @type {zx.io.api.client.AbstractClientTransport}
     */
    __transport: null,
    /**
     * @type {qx.data.Array<zx.server.work.ui.model.WorkerPool>}
     */
    __children: null,

    /**
     * @type {Promise<qx.data.Array<zx.server.work.ui.model.WorkerPool>>}
     */
    __promiseLoadChildren: null,

    /**
     *
     * @returns {qx.data.Array<zx.server.work.ui.model.WorkerPool> | Promise<qx.data.Array<zx.server.work.ui.model.WorkerPool>>}
     */
    getChildren() {
      const doit = async () => {
        let poolsJson = await this.__api.getPools();
        let children = [];
        for (let poolJson of poolsJson) {
          let pool = new zx.server.work.ui.model.WorkerPool(this, this.__transport, poolJson);
          children.push(pool);
        }
        this.__children = new qx.data.Array(children);
        this.__promiseLoadChildren = null;
        return this.__children;
      };

      if (this.__children) {
        return this.__children;
      }

      if (!this.__promiseLoadChildren) {
        this.__promiseLoadChildren = doit();
      }
      return this.__promiseLoadChildren;
    },

    /**
     *
     * @returns {zx.server.work.ui.model.ScheduledWork[]}
     */
    async getCurrentWork() {
      let queuedWork = await this.__api.getQueuedWork();
      let runningWork = await this.__api.getRunningWork();
      runningWork.forEach(json => {
        json.running = true;
      });

      return [...queuedWork, ...runningWork].map(json =>
        new zx.server.work.ui.model.ScheduledWork(json.workJson.uuid).set({
          workClassname: json.workJson.workClassname,
          running: json.running
        })
      );
    },

    /**
     * @param {zx.server.work.scheduler.ISchedulerApi.SearchData} query
     * @returns {Promise<zx.server.work.ui.model.WorkResult[]>}
     */
    async getPastWorkResults(query) {
      let resultsJson = await this.getApi().getPastWorkResults(query);
      let results = resultsJson.map(result => zx.server.work.ui.model.WorkResult.get(result));
      return results;
    },

    /**
     * @returns {zx.server.work.scheduler.ISchedulerApi}
     */
    getApi() {
      return this.__api;
    }
  }
});
