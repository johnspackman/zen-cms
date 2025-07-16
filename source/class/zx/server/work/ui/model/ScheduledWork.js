/**
 * Proxy object representing work which has been scheduled to run on the scheduler.
 */
qx.Class.define("zx.server.work.ui.model.ScheduledWork", {
  extend: qx.core.Object,

  /**
   *
   * @param {string} uuid
   */
  construct(uuid) {
    super();
    this.setExplicitUuid(uuid);
  },
  properties: {
    workClassname: {
      check: "String",
      event: "changeWorkClassname"
    },
    /**
     * If false, the work has been queued on the scheduler but is not running yet.
     * If true, the work is currently running.
     */
    running: {
      check: "Boolean",
      event: "changeRunning",
      init: false
    }
  }
});
