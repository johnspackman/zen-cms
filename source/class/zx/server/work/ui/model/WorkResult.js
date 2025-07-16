/**
 * Proxy object representing a work result.
 * A work result can either represent a work that is currently running or one that has completed in the past.
 */
qx.Class.define("zx.server.work.ui.model.WorkResult", {
  extend: qx.core.Object,
  /**
   * @param {zx.server.work.ui.model.WorkerTracker?} tracker
   * @param {zx.server.work.WorkResult.WorkResultJson?} workResultJson
   */
  construct(tracker, workResultJson) {
    super();
    this.__tracker = tracker;
    this.setExplicitUuid(workResultJson.workJson.uuid);
    if (workResultJson) {
      this.update(workResultJson);
    }
  },
  properties: {
    /**
     * Name of work.
     */
    title: {
      check: "String",
      event: "changeTitle",
      init: null,
      nullable: true
    },
    /**
     * Description of work.
     */
    description: {
      check: "String",
      event: "changeDescription",
      init: null,
      nullable: true
    },
    workClassname: {
      check: "String",
      event: "changeWorkClassname"
    },
    /**
     * @type {zx.server.work.IWork.WorkJson}
     */
    workJson: {
      check: "Object",
      event: "changeWorkJson"
    },
    logOutput: {
      check: "String",
      event: "changeLogOutput"
    },
    started: {
      check: "Date",
      event: "changeStarted"
    },
    completed: {
      check: "Date",
      event: "changeCompleted",
      init: null,
      nullable: true,
      apply: "_updateDerivedProps"
    },
    exceptionStack: {
      check: "String",
      event: "changeExceptionStack",
      apply: "_updateDerivedProps",
      init: null,
      nullable: true
    },
    success: {
      check: "Boolean",
      event: "changeSuccess",
      init: null,
      nullable: true
    },
    /*
    //pseudo-property
    //Only set when the work is running
    tracker: {
      check: "zx.server.work.ui.model.WorkerTracker",
      nullable: true
    }
    */
    /**
     * If the task was killed by the user in the user by calling the `kill` method
     */
    userKilled: {
      check: "Boolean",
      event: "changeUserKilled",
      init: false
    }
  },
  events: {
    /**
     * Event for pseudo-property `tracker`. Never fired because tracker is set only once.
     */
    changeTracker: "qx.event.type.Data"
  },
  members: {
    /**
     * @type {zx.server.work.ui.model.WorkerTracker?}
     */
    __tracker: null,

    /**
     *
     * Getter for pseudo-property `tracker`
     * @returns {zx.server.work.ui.model.WorkerTracker?}
     */
    getTracker() {
      return this.__tracker;
    },

    _updateDerivedProps() {
      this.setSuccess(this.getCompleted() ? !this.getExceptionStack() : null);
    },
    /**
     *
     * @param {zx.server.work.WorkResult.WorkResultJson} workResultJson
     */
    update(workResultJson) {
      this.set({
        title: workResultJson.workJson.title ?? null,
        description: workResultJson.workJson.description ?? null,
        workJson: workResultJson.workJson,
        workClassname: workResultJson.workJson.workClassname,
        logOutput: workResultJson.log,
        started: workResultJson.workStatus?.started ?? null,
        completed: workResultJson.workStatus?.completed ?? null,
        exceptionStack: workResultJson.response?.exceptionStack ?? workResultJson.response?.exception ?? null
      });
    },

    async kill() {
      if (this.getUserKilled()) {
        throw new Error("Work already killed by user");
      }
      this.setUserKilled(true);
      await this.getTracker().getPool().getApi().killWork(this.toUuid());
    }
  }
});
