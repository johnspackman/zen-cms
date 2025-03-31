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
 * WorkResult captures the Work results - status and log files; it can persist itself so that a WorkerPool can
 * store it until the Scheduler is ready to collect the results
 */
qx.Class.define("zx.server.work.WorkResult", {
  extend: qx.core.Object,

  construct() {
    super();
  },

  statics: {
    __DF_LOG: new qx.util.format.DateFormat("yyyy-MM-dd HH:mm:ss"),

    /**
     * Restores a WorkResult from a directory
     */
    async loadFromDir(workdir) {
      let result = new zx.server.work.WorkResult();
      result.__workdir = workdir;
      result.__jsonWork = await zx.utils.Json.loadJsonAsync(path.join(workdir, "work.json"));
      result.__workStatus = await zx.utils.Json.loadJsonAsync(path.join(workdir, "status.json"));
      if (!result.__jsonWork || !result.__workStatus) {
        qx.log.Logger.error("Error loading WorkResult from " + workdir + ": jsonWork=" + JSON.stringify(result.__jsonWork) + " workStatus=" + JSON.stringify(result.__workStatus));
        return null;
      }
      return result;
    },

    /**
     * Deserializes a WorkResult, as received by the Scheduler and serialized by calling `serializeForScheduler`
     */
    async deserializeFromScheduler(workdir, jsonResult) {
      let result = new zx.server.work.WorkResult();
      result.__workdir = workdir;
      result.__jsonWork = jsonResult.workJson;
      result.__workStatus = jsonResult.workStatus;
      await fs.promises.writeFile(path.join(workdir, "work.json"), JSON.stringify(jsonResult.workJson, null, 2));
      await fs.promises.writeFile(path.join(workdir, "status.json"), JSON.stringify(jsonResult.workStatus, null, 2));
      await fs.promises.writeFile(path.join(workdir, "log.txt"), jsonResult.log);
      return result;
    }
  },

  members: {
    /** @type{*?} the currently running work */
    __jsonWork: null,

    /** @type{String} the path for storing anythign to do with the Work being run by the Worker (eg log files) */
    __workdir: null,

    /** @type{WriteStream} where to write logs for the Work */
    __logStream: null,

    /** @type{*} JSON status that is written into the workdir */
    __workStatus: null,

    /**
     * Called when starting the work to capture the results
     */
    async initialize(workdir, jsonWork) {
      this.__workdir = workdir;
      this.__jsonWork = jsonWork;
      await fs.promises.mkdir(this.__workdir, { recursive: true });
      let logFilePath = path.join(this.__workdir, "log.txt");
      this.__logStream = fs.createWriteStream(logFilePath);
      await fs.promises.writeFile(path.join(this.__workdir, "work.json"), JSON.stringify(jsonWork, null, 2));
      this.__workStatus = {
        started: new Date(),
        logFile: path.resolve(logFilePath)
      };
      this.appendWorkLog("Starting work: " + JSON.stringify(jsonWork, null, 2));
      this.writeStatus();
    },

    /**
     * Serializes the WorkResult ready to send back to the Scheduler
     */
    async serializeForScheduler() {
      return {
        workJson: this.__jsonWork,
        workStatus: this.__workStatus,
        log: await this.getWorkLog(),
        response: this.response
      };
    },

    /**
     * Called when the work is complete
     */
    async close() {
      this.__workStatus.completed = new Date();
      this.__logStream.close();
      this.__logStream = null;
      await this.writeStatus();
    },

    /**
     * The work directory
     *
     * @returns {String} the path to the work directory
     */
    getWorkDir() {
      return this.__workdir;
    },

    /**
     * Returns the JSON for the work
     *
     * @returns {*} the JSON for the work
     */
    getJsonWork() {
      return this.__jsonWork;
    },

    /**
     * Deletes the work directory
     */
    async deleteWorkDir() {
      if (this.__workdir) {
        await fs.promises.rm(this.__workdir, { recursive: true, force: true });
        this.__workdir = null;
      }
    },

    /**
     * Appends a message to the log for the Work
     *
     * @param {String} message
     */
    appendWorkLog(message) {
      if (this.__logStream) {
        this.__logStream.write(zx.server.work.WorkResult.__DF_LOG.format(new Date()) + " " + message + "\n");
      }
    },

    /**
     * Returns a description of the work
     * @returns {Object}
     */
    getDescriptionJson() {
      return {
        status: this.__workStatus,
        workJson: this.__jsonWork
      };
    },

    /**
     * Returns the log file contents for the work
     */
    async getWorkLog() {
      return await fs.promises.readFile(path.join(this.__workdir, "log.txt"), "utf8");
    },

    /**
     * Persists the __workStatus to disk
     */
    async writeStatus() {
      await fs.promises.writeFile(path.join(this.__workdir, "status.json"), JSON.stringify(this.__workStatus, null, 2));
    },

    /**
     * @Override
     */
    toString() {
      return this.classname + " " + this.__jsonWork?.uuid + " " + this.__workdir;
    }
  }
});
