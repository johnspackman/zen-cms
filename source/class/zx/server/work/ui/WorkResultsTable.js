/**
 * A table showing work results, which can either be currently running or completed in the past.
 */
qx.Class.define("zx.server.work.ui.WorkResultsTable", {
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

      const SuccessColumn = qx.Class.define(this.classname + ".SuccessColumn", {
        extend: qxl.datagrid.column.Column,
        members: {
          /**@override */
          bindWidget(widget, model) {
            let bindings = new qxl.datagrid.binding.Bindings(
              model,
              model.bind("success", widget, "source", {
                converter: (data, model, source, target) => {
                  return data === null
                    ? null //br
                    : data === true
                    ? "@FontAwesome/check/16"
                    : "@FontAwesome/xmark/16";
                }
              })
            );
            return bindings;
          },
          /**@override */
          createWidgetForDisplay() {
            return new qx.ui.basic.Image();
          }
        }
      });

      columns.addAll([
        new qxl.datagrid.column.TextColumn().set({
          path: "workClassname",
          caption: "Work Class",
          minWidth: 200
        }),
        new qxl.datagrid.column.TextColumn().set({
          path: "title",
          caption: "Title",
          minWidth: 300,
          flex: 1
        }),
        new qxl.datagrid.column.DateColumn().set({
          path: "started",
          caption: "Started",
          minWidth: 150,
          dateFormat: df
        }),
        new qxl.datagrid.column.DateColumn().set({
          path: "completed",
          caption: "Completed",
          minWidth: 150,
          dateFormat: df
        }),
        new SuccessColumn().set({
          caption: "Success?",
          minWidth: 100
        })
      ]);
      return columns;
    }
  },
  members: {
    /**
     * @type {qx.datagrid.source.ArrayDataSource<zx.server.work.ui.model.WorkResult>}
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
     * @returns {qx.datagrid.source.ArrayDataSource<zx.server.work.ui.model.WorkResult>} The data source used by the datagrid.
     */
    getDataSource() {
      return this.__dataSource;
    },

    /**
     *
     * @param {qx.data.Array<zx.server.work.ui.model.WorkResult>} model
     */
    setModel(model) {
      this.__dataSource.setModel(model);
    },

    resetModel() {
      this.__dataSource.resetModel();
    }
  }
});
