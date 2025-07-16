qx.Class.define("zx.server.work.ui.NodeInspector", {
  extend: qxl.datagrid.source.tree.NodeInspector,

  members: {
    /**@override */
    canHaveChildren(node) {
      return !(node instanceof zx.server.work.ui.model.WorkerTracker);
    }
  }
});
