/**
 * Proxy object representing a work result.
 * A work result can either represent a work that is currently running or one that has completed in the past.
 * Its uuid is workJson.uuid + "/" + UNIX timestamp of when the work started
 */
qx.Class.define("zx.server.work.ui.model.WorkResult", {
  extend: qx.core.Object,
  /**
   * @private
   * @param {zx.server.work.WorkResult.WorkResultJson?} workResultJson
   */
  construct(workResultJson) {
    super();
    this.setExplicitUuid(this.constructor.getUuid(workResultJson));
    if (workResultJson) {
      this.__update(workResultJson);
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

    //Only set when the work is running
    tracker: {
      check: "zx.server.work.ui.model.WorkerTracker",
      event: "changeTracker",
      init: null,
      nullable: true
    },
    /**
     * If the task was killed by the user in the user by calling the `kill` method
     */
    userKilled: {
      check: "Boolean",
      event: "changeUserKilled",
      init: false
    }
  },
  statics: {
    /**
     * @type {Object<string, zx.server.work.ui.model.WorkResult>} Key is UUID, value is WorkResult instance
     */
    __instances: {},

    /**
     *
     * @param {string|zx.server.work.WorkResult.WorkResultJson} json
     * @returns {zx.server.work.ui.model.WorkResult}
     */
    get(json) {
      let uuid = typeof json === "string" ? json : this.getUuid(json);
      let instance = this.__instances[uuid];
      if (!instance) {
        instance = new zx.server.work.ui.model.WorkResult(json);
      } else {
        instance.__update(json);
      }

      this.__instances[uuid] = instance;
      return instance;
    },

    /**
     *
     * @param {zx.server.work.WorkResult.WorkResultJson} workResultJson
     * @returns {string} The UUID to assign to a work result based on its workJson
     */
    getUuid(workResultJson) {
      return workResultJson.workJson.uuid + "/" + workResultJson.workStatus.started.getTime();
    }
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
    __update(workResultJson) {
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
