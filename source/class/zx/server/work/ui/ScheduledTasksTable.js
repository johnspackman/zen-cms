/**
 * Table showing tasks for a scheduler (zx.server.work.ui.model.Scheduler).
 */
qx.Class.define("zx.server.work.ui.ScheduledTasksTable", {
  extend: qx.ui.core.Widget,
  construct() {
    super();
    this.__dataSource = new qxl.datagrid.source.ArrayDataSource().set({ columns: this.getQxObject("columns") });

    this._setLayout(new qx.ui.layout.Grow());
    this._add(this.getQxObject("datagrid"));
  },
  objects: {
    columns() {
      let columns = new qxl.datagrid.column.Columns();

      const RunningColumn = qx.Class.define(this.classname + ".RunningColumn", {
        extend: qxl.datagrid.column.Column,
        members: {
          /**@override */
          bindWidget(widget, model) {
            let bindings = new qxl.datagrid.binding.Bindings(
              model,
              model.bind("running", widget, "source", {
                converter: (data, model, source, target) => {
                  return data ? "@FontAwesome/check/16" : "@FontAwesome/xmark/16";
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
          flex: 1
        }),
        new RunningColumn().set({
          caption: "Running?",
          minWidth: 150
        })
      ]);
      return columns;
    },

    datagrid() {
      let grid = new qxl.datagrid.ClippedScrollDataGrid(this.getQxObject("columns")).set({ dataSource: this.__dataSource });
      return grid;
    }
  },
  events: {
    requestShowWorkDetail: "qx.event.type.Data"
  },
  members: {
    /**
     *
     * @returns {qxl.datagrid.source.ArrayDataSource<zx.server.work.ui.model.ScheduledWork>}
     */
    getDataSource() {
      return this.__dataSource;
    },

    /**
     *
     * @returns {qxl.datagrid.DataGrid}
     */
    getDatagrid() {
      return this.getQxObject("datagrid");
    }
  }
});
