/**
 * UI for managing schedulers, pools, and workers.
 */
qx.Class.define("zx.server.work.ui.SchedulerMgr", {
  extend: qx.ui.core.Widget,
  /**
   *
   * @param {zx.io.api.client.AbstractClientTransport} transport The transport used to commiunicate with the scheduler server.
   */
  construct(transport) {
    super();
    this.__transport = transport;
    this._setLayout(new qx.ui.layout.Grow());
    this._add(this.getQxObject("tabView"));
  },

  objects: {
    tabView() {
      let tabView = new qx.ui.tabview.TabView();
      tabView.add(this.getQxObject("pageTasks"));
      tabView.add(this.getQxObject("pageSchedulers"));
      return tabView;
    },
    pageSchedulers() {
      let pg = new qx.ui.tabview.Page("Scheduler View");
      pg.add(this.getQxObject("schedulersView"));
      pg.setLayout(new qx.ui.layout.Grow());
      return pg;
    },
    pageTasks() {
      let pg = new qx.ui.tabview.Page("Tasks View");
      pg.add(this.getQxObject("tasksView"));
      pg.setLayout(new qx.ui.layout.Grow());
      return pg;
    },
    schedulersView() {
      return new zx.server.work.ui.SchedulersView(this.__transport);
    },
    tasksView() {
      return new zx.server.work.ui.tasksview.TasksView(this.__transport);
    }
  },
  members: {
    /**
     * @type {zx.io.api.client.AbstractClientTransport}
     */
    __transport: null
  }
});
