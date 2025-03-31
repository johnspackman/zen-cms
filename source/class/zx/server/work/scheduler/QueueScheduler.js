/* ************************************************************************
*
*  Zen [and the art of] CMS
*
*  https://zenesis.com
*
*  Copyright:
*    2019-2025 Zenesis Ltd, https://www.zenesis.com
*
*  License:
*    MIT (see LICENSE in project root)
*
*  Authors:
*    John Spackman (john.spackman@zenesis.com, @johnspackman)
*
* ************************************************************************ */

const fs = require("fs");
const path = require("path");

/**
 * A simple queue based scheduler
 *
 * @typedef WorkQueueEntry
 * @property {zx.server.work.IWork.WorkJson} workJson the work to do
 * @property {Promise} promise the promise which resolves when the work is done
 *
 *
 * @use(zx.io.api.client.AbstractClientApi)
 */
qx.Class.define("zx.server.work.scheduler.QueueScheduler", {
  extend: qx.core.Object,
  implement: [zx.server.work.scheduler.ISchedulerApi],

  construct(workDir) {
    super();
    this.__queue = [];
    this.__running = {};
    this.__workDir = workDir;
    this.__serverApi = zx.io.api.ApiUtils.createServerApi(zx.server.work.scheduler.ISchedulerApi, this);
  },

  properties: {
    /** Whether to rotate working directories so that there is a seperate dir per day and startup, inside the `workDir` given to the constructor */
    rotateWorkDir: {
      check: "Boolean",
      init: false
    }
  },

  events: {
    /** Fired when a work item is started, the data is the serialized JSON from `WorkResult.serializeForScheduler` */
    workStarted: "qx.event.type.Data",

    /** Fired when a work item is completed, the data is the serialized JSON from `WorkResult.serializeForScheduler` */
    workCompleted: "qx.event.type.Data",

    /** Fired when there is no work to do */
    noWork: "qx.event.type.Event"
  },

  members: {
    /** @type {String?} the directory to store work results */
    __workDir: null,

    /** @type {String} the directory to store work results, after rotation */
    __rotatedWorkDir: null,

    /** @type {Date} the last day that we tried to rotate - we only check once per day */
    __lastRotation: null,

    /** @type {WorkQueueEntry[]} the queue */
    __queue: null,

    /** @type {Object<String, WorkQueueEntry>} the running work, indexed by work UUID */
    __running: null,

    /** @type {zx.server.work.scheduler.ISchedulerApi} a server API that can be used to call this scheduler */
    __serverApi: null,

    /**
     * Starts the scheduler
     */
    async startup() {
      if (this.__workDir) {
        await fs.promises.mkdir(this.__workDir, { recursive: true });
      }
    },

    /**
     * Returns the working directory, used for logs etc
     *
     * @returns {String?} the directory to store work results
     */
    getWorkDir() {
      if (!this.__workDir) {
        return null;
      }
      if (this.getRotateWorkDir()) {
        if (!zx.utils.Dates.sameDay(this.__lastRotation, new Date())) {
          const DF = new qx.util.format.DateFormat("yyyy-MM-dd");
          let dir = path.join(this.__workDir, DF.format(new Date()));
          let testForDir = dir;
          let pass = 0;
          while (true) {
            let stat = null;
            try {
              stat = fs.statSync(this.__workDir);
            } catch (ex) {
              // Nothing - does not exist
            }
            if (stat) {
              pass++;
              testForDir = `${dir}-${pass}`;
            } else {
              break;
            }
          }
          this.__rotatedWorkDir = testForDir;
          this.__lastRotation = new Date();
        }
        return this.__rotatedWorkDir;
      }
      return this.__workDir;
    },

    /**
     * Adds a work item to the queue
     *
     * @param {zx.server.work.IWork.WorkJson} workJson
     * @return {Promise} resolves when the work is completed
     */
    async pushWork(workJson) {
      if (!workJson.workClassname) {
        throw new Error("workJson must have a workClassname");
      }
      if (!workJson.uuid) {
        workJson.uuid = qx.util.Uuid.createUuidV4();
      }
      if (this.__running[workJson.uuid]) {
        this.error(`Work ${workJson.uuid} is already running`);
        return;
      }
      if (this.__queue.find(entry => entry.workJson.uuid === workJson.uuid)) {
        this.error(`Work ${workJson.uuid} is already queued`);
        return;
      }
      this.debug(`Queuing job ${workJson.uuid} of type ${workJson.workClassname}`);
      let promise = new qx.Promise();
      this.__queue.push({
        workJson,
        promise
      });
      await promise;
    },

    /**
     * @Override
     */
    async pollForWork() {
      if (this.__queue.length === 0) {
        this.fireEvent("noWork");
        return null;
      }
      let info = this.__queue.shift();
      this.__running[info.workJson.uuid] = info;
      await this.fireDataEventAsync("workStarted", info.workJson);
      return info.workJson;
    },

    /**
     * @Override
     */
    async onWorkCompleted(workResultData) {
      this.debug(`Work completed for job ${workResultData.workJson.uuid}`);
      let info = this.__running[workResultData.workJson.uuid];
      if (info) {
        delete this.__running[workResultData.workJson.uuid];
        info.promise.resolve(workResultData);
        await this.fireDataEventAsync("workCompleted", workResultData);
      } else {
        this.debug(`Work completed for job ${workResultData.workJson.uuid} but not found in running list (Worker Pool has queued this work)`);
      }
      const archiveIt = async () => {
        let workDir = path.join(this.getWorkDir(), zx.server.Standalone.getUuidAsPath(workResultData.workJson.uuid));
        await fs.promises.mkdir(workDir, { recursive: true });
        let workResult = zx.server.work.WorkResult.deserializeFromScheduler(workDir, workResultData);
      };
      if (this.__workDir) {
        archiveIt();
      }
    },

    /**
     * Returns the server API for this scheduler
     *
     * @return {zx.server.work.scheduler.ISchedulerApi}
     */
    getServerApi() {
      return this.__serverApi;
    },

    /**
     * Returns the queue size
     *
     * @returns {Number} the number of items in the queue
     */
    getQueueSize() {
      return this.__queue.length;
    },

    /**
     * Returns the number of tasks currently running
     *
     * @returns {Number} the number of items running
     */
    getRunningSize() {
      return Object.keys(this.__running).length;
    }
  }
});
