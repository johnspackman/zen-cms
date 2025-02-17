/* ************************************************************************
 *
 *  Zen [and the art of] CMS
 *
 *  https://zenesis.com
 *
 *  Copyright:
 *    2019-2022 Zenesis Ltd, https://www.zenesis.com
 *
 *  License:
 *    MIT (see LICENSE in project root)
 *
 *  Authors:
 *    Will Johnson (@willsterjohnson)
 *
 * ************************************************************************ */

/**
 * The local pool runs work in the same main thread as the pool
 */
qx.Class.define("zx.work.pool.LocalPool", {
  extend: zx.work.AbstractWorkerPool,
  implement: [zx.work.IWorkerFactory],

  construct() {
    super();
    this.__workerMap = new Map();
    this.getQxObject("pool").setFactory(this);
  },

  members: {
    /**@type {Map<zx.work.api.WorkerClientApi, zx.work.api.WorkerServerApi>} */
    __workerMap: null,

    /**
     * creates a new instance
     * @returns {Promise<zx.work.api.WorkerClientApi>}
     */
    async create() {
      let apiPath = this._createPath("workerApi");

      let serverTransport = new zx.io.api.transport.loopback.Server();
      let clientTransport = new zx.io.api.transport.loopback.Client();

      serverTransport.connect(clientTransport);
      clientTransport.connect(serverTransport);

      let server = new zx.work.api.WorkerServerApi(apiPath);
      let client = new zx.work.api.WorkerClientApi(clientTransport, apiPath);

      this.__workerMap.set(client, server);

      await client.subscribe("log", this._onLog.bind(this));
      await client.subscribe("complete", this._onComplete.bind(this));

      return client;
    },

    /**
     * Destroys an instance entirely
     * @param {zx.work.api.WorkerClientApi} client
     */
    async destroy(client) {
      let server = this.__workerMap.get(client);
      server.dispose();
      this.__workerMap.delete(client);
      await client.unsubscribe("log");
      await client.unsubscribe("complete");
      client.dispose();
    }
  }
});
