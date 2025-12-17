/* ************************************************************************
 *
 *  Zen [and the art of] CMS
 *
 *  https://zenesis.com
 *
 *  Copyright:
 *    2019-2026 Zenesis Ltd, https://www.zenesis.com
 *
 *  License:
 *    MIT (see LICENSE in project root)
 *
 *  Authors:
 *    John Spackman (john.spackman@zenesis.com, @johnspackman)
 *
 * ************************************************************************ */

const fs = require("fs");

/**
 * Operates a background process - this means that it will use `zx.utils.ChildProcess` to execute an
 * external operating system process, and watch it to make sure that it stays running.  If it stops,
 * it will be restarted (after a short delay to avoid thrashing in the event of a persistent problem).
 *
 * This `BackgroundProcess` class should be started and stopped - when stopping, it will try to stop the
 * process gracefully, but if it does not stop within a few seconds, it will be killed.
 *
 * The PID will be stored in a file, and when the `BackgroundProcess` is started, it will check
 * for an existing PID file and see if the process is still running.  If it is, it will stop that
 * process before starting a new one.
 */
qx.Class.define("zx.utils.BackgroundProcess", {
  extend: qx.core.Object,

  properties: {
    /** Command to execute */
    childProcess: {
      check: "zx.utils.ChildProcess",
      apply: "_applyChildProcess",
      event: "changeChildProcess"
    },

    /** Filename for the PID */
    pidFilename: {
      check: "String",
      apply: "_applyPidFilename",
      event: "changePidFilename"
    },

    /** How long to wait after the process dies before restarting it */
    delayBeforeRestart: {
      check: "Integer",
      init: 5000,
      event: "changeDelayBeforeRestart"
    }
  },

  members: {
    __status: "stopped",

    /**
     * Starts the background process and monitors it to keep it running
     */
    async start() {
      if (this.__status != "stopped") {
        throw new Error("Background process is already started (status=" + this.__status + ")");
      }
      this.__status = "starting";
      let pid = await this.__readPidFile();

      if (pid) {
        this.debug("Checking for existing process with PID " + pid);
        try {
          this.debug("Killing existing process with PID " + pid);
          process.kill(pid);
        } catch (ex) {
          this.debug("No existing process with PID " + pid);
        }
      }
      await this.__deletePidFile();
      let childProcess = this.getChildProcess();
      await childProcess.start();
      this.__status = "started";
    },

    /**
     * Stops the background process
     */
    async stop() {
      if (this.__status != "started") {
        throw new Error("Background process is already started (status=" + this.__status + ")");
      }
      this.__status = "stopping";
      let childProcess = this.getChildProcess();
      await childProcess.stop();
      await this.__deletePidFile();
      this.__status = "stopped";
    },

    /**
     * Called when the child process starts
     *
     * @param {qx.event.type.Data} e
     */
    _onChildProcessStart(e) {
      let pid = e.getData();
      this.debug("Child process started with PID " + pid);
      this.__writePidFile(pid);
    },

    /**
     * Called when the child process stops
     *
     * @param {qx.event.type.Data} e
     */
    _onChildProcessStop(e) {
      this.debug("Child process stopped with exit code " + e.getData());
      if (this.__status === "stopping") {
        this.debug("Not restarting as process is stopping by design");
        return;
      }
      const doRestart = async () => {
        await this.__deletePidFile();
        let delay = this.getDelayBeforeRestart();
        let childProcess = this.getChildProcess();
        this.debug("Restarting in " + delay + "ms");
        qx.event.Timer.once(() => childProcess.start(), this, delay);
      };
      doRestart();
    },

    /**
     * Reads the PID of the background process
     *
     * @returns {Integer?}
     */
    async __readPidFile() {
      let pidFilename = this.getPidFilename();
      try {
        let pidData = await fs.promises.readFile(pidFilename, { encoding: "utf8" });
        let pid = parseInt(pidData, 10);
        if (isNaN(pid)) {
          this.trace("PID file " + pidFilename + " contains invalid data: " + pidData);
          return null;
        }
        return pid;
      } catch (ex) {
        if (ex.code !== "ENOENT") {
          throw new Error("Error reading PID file " + pidFilename + ": " + ex.message);
        }
      }
      return null;
    },

    /**
     * Writes the PID file with the given PID
     * @param {Integer} pid
     */
    async __writePidFile(pid) {
      let pidFilename = this.getPidFilename();
      await fs.promises.writeFile(pidFilename, String(pid), { encoding: "utf8" });
    },

    /**
     * Deletes the PID file
     */
    async __deletePidFile() {
      let pidFilename = this.getPidFilename();
      try {
        await fs.promises.unlink(pidFilename);
      } catch (ex) {
        if (ex.code !== "ENOENT") {
          throw new Error("Error deleting PID file " + pidFilename + ": " + ex.message);
        }
      }
    },

    /**
     * Apply method for childProcess property
     */
    _applyChildProcess(value, oldValue) {
      if (oldValue) {
        oldValue.removeListener("onStop", this._onChildProcessStop, this);
        oldValue.removeListener("onStart", this._onChildProcessStart, this);
      }
      if (value) {
        value.addListener("onStop", this._onChildProcessStop, this);
        value.addListener("onStart", this._onChildProcessStart, this);
      }
    }
  }
});
