/**
 * UI for managing a worker tracker.
 */
qx.Class.define("zx.server.work.ui.WorkerTrackerEditor", {
  extend: qx.ui.core.Widget,
  construct() {
    super();

    this._setLayout(new qx.ui.layout.Grow());
    let edWorkResult = new zx.server.work.ui.WorkResultEditor();
    this.bind("value.workResult", edWorkResult, "value");
    this._add(edWorkResult);
  },
  properties: {
    value: {
      check: "zx.server.work.ui.model.WorkerTracker",
      event: "changeValue",
      init: null,
      nullable: true
    }
  }
});
