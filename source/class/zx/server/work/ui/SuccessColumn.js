qx.Class.define("zx.server.work.ui.SuccessColumn", {
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
