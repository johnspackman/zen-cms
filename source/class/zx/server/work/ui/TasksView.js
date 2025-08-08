qx.Class.define("zx.server.work.ui.TasksView", {
  extend: qx.ui.core.Widget,
  /**
   *
   * @param {*} transport
   */
  construct(transport) {
    super();
    this.__api = zx.io.api.ApiUtils.createClientApi(zx.server.work.scheduler.ITasksApi, transport, "/tasks");

    let refreshTimer = new zx.utils.Timeout(2000, () => this.__refreshResults()).set({ recurring: true });
    this.addListener("appear", () => refreshTimer.setEnabled(true));
    this.addListener("disappear", () => refreshTimer.setEnabled(false));

    this._setLayout(new qx.ui.layout.Grow());
    let scroll = new qx.ui.container.Scroll();
    this._add(scroll);
    let comp = new qx.ui.container.Composite(new qx.ui.layout.VBox(10));
    scroll.add(comp);

    comp.add(this.getQxObject("compEdtSearch"));
    comp.add(this.getQxObject("tblTasks"));
    comp.add(this.getQxObject("edTask"), { flex: 1 });
  },
  properties: {},
  objects: {
    compEdtSearch() {
      let comp = new qx.ui.container.Composite(new qx.ui.layout.HBox(5));
      comp.add(this.getQxObject("edtSearch"), { flex: 1 });
      comp.add(this.getQxObject("cbxShowRunning"));
      return comp;
    },
    edtSearch() {
      let searchField = new zx.ui.form.SearchField();
      searchField.addListener("search", async evt => {
        let table = this.getQxObject("tblTasks");
        table.resetModel();
        this.__refreshResults();
      });
      searchField.linkWidget(this.getQxObject("cbxShowRunning"));
      return searchField;
    },
    cbxShowRunning() {
      let cbx = new qx.ui.form.CheckBox("Show Running Only");
      cbx.setValue(true);
      return cbx;
    },
    tblTasks() {
      let table = new zx.server.work.ui.TasksTable().set({ minHeight: 400 });
      table.getDatagrid().bind("selection[0]", this.getQxObject("edTask"), "value");
      table.getDatagrid().bind("selection[0]", this.getQxObject("edTask"), "visibility", {
        converter: sel => (sel ? "visible" : "excluded")
      });
      return table;
    },
    edTask() {
      return new zx.server.work.ui.TaskEditor();
    }
  },
  members: {
    /**
     * @type {zx.server.work.scheduler.ITasksApi}
     */
    __api: null,

    async __refreshResults() {
      let api = this.__api;
      let query = this.getQxObject("edtSearch").getValue();
      let runningOnly = this.getQxObject("cbxShowRunning").getValue();
      let tasksJson = await api.searchTasks({ text: query, runningOnly: runningOnly });
      if (query !== this.getQxObject("edtSearch").getValue() || runningOnly !== this.getQxObject("cbxShowRunning").getValue()) {
        //search was changed while we were waiting for the results
        return;
      }
      let table = this.getQxObject("tblTasks");
      let tasks = new qx.data.Array(tasksJson.map(task => zx.server.work.ui.model.ScheduledTask.get(api, task)));
      table.setModel(tasks);
    }
  }
});
