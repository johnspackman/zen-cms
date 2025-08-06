qx.Class.define("zx.server.work.ui.tasksview.TasksView", {
  extend: qx.ui.core.Widget,
  /**
   *
   * @param {*} transport
   */
  construct(transport) {
    super();
    this.__api = zx.io.api.ApiUtils.createClientApi(zx.server.work.scheduler.ITasksApi, transport, "/tasks");

    this._setLayout(new qx.ui.layout.Grow());
    let scroll = new qx.ui.container.Scroll();
    this._add(scroll);
    let comp = new qx.ui.container.Composite(new qx.ui.layout.VBox(10));
    scroll.add(comp);

    comp.add(this.getQxObject("edtSearch"));
    comp.add(this.getQxObject("tblTasks"));
    comp.add(this.getQxObject("edTask"), { flex: 1 });
  },
  properties: {},
  objects: {
    edtSearch() {
      let searchField = new zx.ui.form.SearchField();
      searchField.addListener("search", async evt => {
        let api = this.__api;
        let table = this.getQxObject("tblTasks");
        table.resetModel();
        let tasksJson = await api.searchTasks({ title: evt.getData() });
        let tasks = new qx.data.Array(tasksJson.map(task => zx.server.work.ui.model.ScheduledTask.get(api, task)));
        table.setModel(tasks);
      });
      return searchField;
    },
    tblTasks() {
      let table = new zx.server.work.ui.tasksview.TasksTable().set({ minHeight: 400 });
      table.getDatagrid().bind("selection[0]", this.getQxObject("edTask"), "value");
      table.getDatagrid().bind("selection[0]", this.getQxObject("edTask"), "visibility", {
        converter: sel => (sel ? "visible" : "excluded")
      });
      return table;
    },
    edTask() {
      return new zx.server.work.ui.tasksview.TaskEditor();
    }
  },
  members: {
    /**
     * @type {zx.server.work.scheduler.ITasksApi}
     */
    __api: null
  }
});
