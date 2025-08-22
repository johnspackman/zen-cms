/**
 * A table showing work results, which can either be currently running or completed in the past.
 */
qx.Class.define("zx.server.work.ui.TasksTable", {
  extend: qx.ui.core.Widget,
  construct() {
    super();
    this._setLayout(new qx.ui.layout.Grow());
    this.__dataSource = new qxl.datagrid.source.ArrayDataSource().set({ columns: this.getQxObject("columns") });
    this._add(this.getQxObject("datagrid"));
  },
  objects: {
    datagrid() {
      let grid = new qxl.datagrid.ClippedScrollDataGrid(this.getQxObject("columns")).set({ dataSource: this.__dataSource });
      return grid;
    },

    columns() {
      let columns = new qxl.datagrid.column.Columns();
      let df = new qx.util.format.DateFormat("yyyy/MM/dd HH:mm:ss");

      columns.addAll([
        new qxl.datagrid.column.TextColumn().set({
          path: "title",
          caption: "Title",
          minWidth: 300,
          flex: 1,
          bindingOptions: () => ({
            converter: status => status ?? "(untitled)"
          })
        }),
        new qxl.datagrid.column.TextColumn().set({
          path: "status",
          caption: "Status",
          minWidth: 300,
          flex: 0,
          bindingOptions: () => ({
            converter: status => qx.lang.String.firstUp(status)
          })
        }),
        new qxl.datagrid.column.DateColumn().set({
          path: "dateStarted",
          caption: "Last Started GMT",
          minWidth: 150,
          dateFormat: df
        }),
        new qxl.datagrid.column.DateColumn().set({
          path: "dateCompleted",
          caption: "Last Completed GMT",
          minWidth: 150,
          dateFormat: df
        }),
        new zx.server.work.ui.SuccessColumn().set({
          caption: "Success?",
          minWidth: 100
        })
      ]);
      return columns;
    }
  },
  members: {
    /**
     * @type {qx.datagrid.source.ArrayDataSource<zx.server.work.ui.model.ScheduledTask>}
     */
    __dataSource: null,
    /**
     *
     * @returns {qx.ui.datagrid.DataGrid} The datagrid instance.
     */
    getDatagrid() {
      return this.getQxObject("datagrid");
    },

    /**
     *
     * @returns {qx.datagrid.source.ArrayDataSource<zx.server.work.ui.model.ScheduledTask>} The data source used by the datagrid.
     */
    getDataSource() {
      return this.__dataSource;
    },

    /**
     *
     * @param {qx.data.Array<zx.server.work.ui.model.ScheduledTask>} model
     */
    setModel(model) {
      this.__dataSource.setModel(model);
    },

    resetModel() {
      this.__dataSource.resetModel();
    }
  }
});
