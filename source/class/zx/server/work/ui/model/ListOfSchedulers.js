qx.Class.define("zx.server.work.ui.model.ListOfSchedulers", {
  extend: qx.core.Object,
  /**
   *
   * @param {zx.io.api.client.AbstractClientTransport} transport
   */
  construct(transport) {
    super();
    this.__children = new qx.data.Array([new zx.server.work.ui.model.Scheduler(transport, "/scheduler")]);
  },
  members: {
    /**
     *
     * @returns {qx.data.Array<zx.server.work.ui.model.Scheduler>}
     */
    getChildren() {
      return this.__children;
    }
  }
});
