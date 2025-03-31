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

const path = require("node:path");

qx.Class.define("zx.server.work.Worker", {
  extend: qx.core.Object,
  implement: [zx.server.work.IWorker],

  construct() {
    super();
    this.__serverApi = zx.io.api.ApiUtils.createServerApi(zx.server.work.IWorkerApi, this);

    /**
     * Promise that resolves when the worker has shutdown
     * and it is safe to terminate the process the worker is running in
     */
    this.__promiseShutdown = new qx.Promise();
  },

  destruct() {
    this.__serverApi.dispose();
  },

  properties: {
    /** URL to access Chromium, if one is available */
    chromiumUrl: {
      init: null,
      nullable: true,
      check: "String"
    },

    /** @type{String[]?} array of mounts, in the form "alias:path" */
    dataMounts: {
      init: null,
      nullable: true,
      check: "Array",
      apply: "_applyDataMounts"
    }
  },

  members: {
    __workJson: null,
    __chromium: null,

    /** @type{Object<String,String>} list of paths for each data mount alias (ie decoded version of the `dataMounts` property) */
    __dataMountPaths: null,

    /**
     * Returns the Server API for this worker
     *
     * @returns {zx.server.work.IWorkerApi}
     */
    getServerApi() {
      return this.__serverApi;
    },

    /**
     * @Override
     */
    getWorkJson() {
      return this.__workJson;
    },

    /**
     * Called to append to the log of the work, and is also published to the WorkerPool
     */
    appendWorkLog(message) {
      if (qx.core.Environment.get("qx.debug")) {
        if (String(message).indexOf("[object Object]") > -1) {
          this.error("Invalid message: " + message);
          debugger;
        }
      }
      this.info(message);
      if (this.__workJson) {
        this.__serverApi.publish("log", { caller: this.__workJson.uuid, message });
      }
    },

    ping() {
      this.__serverApi.publish("ping");
    },

    /**
     * Apply for `dataMounts` property
     */
    _applyDataMounts(value) {
      this.debug("Data mounts: " + value);
      if (value) {
        this.__dataMountPaths = {};
        value.forEach(mount => {
          let pos = mount.indexOf(":");
          let alias = mount.substring(0, pos);
          let filename = path.resolve(mount.substring(pos + 1));
          this.__dataMountPaths[alias] = filename;
        });
      }
    },

    /**
     * Resolves a filename to a full path, assuming that the first part of the filename is an alias
     * from the dataMounts property
     *
     * @param {String} filename
     * @returns {String}
     */
    resolveFile(filename) {
      if (!this.getDataMounts()) {
        return filename;
      }
      let pos = filename.indexOf("/");
      let alias = pos > 0 ? filename.substring(0, pos) : filename;
      let remainder = pos > 0 ? filename.substring(pos + 1) : "";

      let dataMount = this.__dataMountPaths[alias];
      if (!dataMount) {
        return filename;
      }
      let newFilename = path.resolve(dataMount, remainder);
      if (!newFilename.startsWith(dataMount)) {
        throw new Error(`Invalid filename: ${filename} - it must be within the data mount ${dataMount}`);
      }
      return newFilename;
    },

    /**
     * Returns the path for a mounted alias
     *
     * @param {String} alias
     * @returns {String}
     */
    getDataMount(alias) {
      return this.__dataMountPaths[alias] || null;
    },

    /**
     * @Override
     */
    async run(workJson) {
      if (this.__workJson) {
        throw new Error("Cannot run more than one work at a time");
      }
      let workId = `${workJson.workClassname} [${workJson.uuid}]`;
      this.debug("Running work: " + workId);
      let clazz = qx.Class.getByName(workJson.workClassname);
      if (!clazz) {
        throw new Error(`Cannot find class '${workJson.workClassname}'`);
      }
      if (!qx.Class.hasInterface(clazz, zx.server.work.IWork)) {
        throw new Error(`Class '${workJson.workClassname}' does not implement interface zx.server.work.IWork !`);
      }

      let workInstance = new clazz(...(workJson.args || []));
      this.__workInstance = workInstance;
      this.__workJson = workJson;
      workInstance.setExplicitUuid(workJson.uuid);

      let uuid = workJson.uuid;
      let response = {
        returnValue: null,
        exception: null
      };
      try {
        response.returnValue = await workInstance.execute(this);
        this.debug(`${workId} completed successfully, result = ${response.returnValue}`);
        this.__serverApi.publish("complete", { caller: uuid, success: true, response });
      } catch (ex) {
        response.exception = ex.message || ex + "";
        response.exceptionStack = qx.dev.StackTrace.getStackTraceFromError(ex).join(", ");
        this.error(`${workId} EXCEPTION: ${ex.message}`, ex);
        this.__serverApi.publish("complete", { caller: uuid, success: false, response });
      } finally {
        this.__workJson = null;
      }
      return response;
    },

    /**
     * @Override
     */
    async shutdown() {
      await this.__workInstance.abort(this);
      this.dispose();
      this.__promiseShutdown.resolve();
    },

    /**
     * Waits until the worker has shutdown and it is safe to terminate the worker process
     * @returns {qx.Promise<void>}
     */
    async waitUntilShutdown() {
      return this.__promiseShutdown;
    },

    /**
     * Returns the IChromium instance for this worker, if one is available
     *
     * @returns {zx.server.puppeteer.IChromium}
     */
    async getChromium() {
      if (this.__chromium) {
        return this.__chromium;
      }
      if (!this.getChromiumUrl()) {
        return null;
      }
      this.__chromium = new zx.server.work.WorkerChromium(this.getChromiumUrl());
      await this.__chromium.initialise();
      return this.__chromium;
    }
  }
});
