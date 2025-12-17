/* ************************************************************************
 *
 *  Zen [and the art of] CMS
 *
 *  https://zenesis.com
 *
 *  Copyright:
 *    2019-2022 Zenesis Ltd, https://www.zenesis.com
 *
 *  License:
 *    MIT (see LICENSE in project root)
 *
 *  Authors:
 *    John Spackman (john.spackman@zenesis.com, @johnspackman)
 *
 * ************************************************************************ */

const child_process = require("child_process");

/**
 * Operates a child process - this means that it will execute an external operating system
 * process.
 *
 * This `ChildProcess` class can be started and stopped - when stopping, it will try to stop the
 * process gracefully, but if it does not stop within a few seconds, it will be killed.
 *
 */
qx.Class.define("zx.utils.ChildProcess", {
  extend: qx.core.Object,

  properties: {
    /** Command to execute - this is just the process executable name, @see `arguments` property for command line arguments */
    command: {
      check: "String",
      apply: "_applyCommand",
      event: "changeCommand"
    },

    /** Command line arguments for the process */
    arguments: {
      check: "Array",
      init: [],
      apply: "_applyArguments",
      event: "changeArguments"
    },

    /** Current working directory for the process, if null then the current working directory of the parent process is used */
    cwd: {
      init: null,
      nullable: true,
      check: "String",
      event: "changeCwd"
    },

    /** Whether to collect the output from the process */
    collectOutput: {
      init: false,
      check: "Boolean",
      event: "changeCollectOutput"
    },

    /** Whether to copy console output to the parent process' console */
    copyConsoleToParent: {
      init: false,
      check: "Boolean",
      event: "changeCopyConsoleToParent"
    },

    /** How long to wait for the process to shut down gracefully before killing it */
    shutdownGrace: {
      check: "Integer",
      init: 5000,
      event: "changeShutdownGrace"
    }
  },

  events: {
    /**
     * Fired when there is console output, the data property contains `ConsoleData`:
     *
     * @typedef {Object} ConsoleData
     * @property {String} data The console output data
     * @property {String} stream The stream - "stdout" or "stderr"
     */
    onConsole: "qx.event.type.Data",

    /** Fired when the process starts, data is the process ID {Integer} */
    onStart: "qx.event.type.Data",

    /** Fired when the process stops, data is the exit code {Integer} */
    onStop: "qx.event.type.Data",

    /** Fired when there is an error starting or running the process, data is the error object */
    onError: "qx.event.type.Data"
  },

  members: {
    /** @type{child_process.ChildProcess|null} the child process */
    __process: null,

    /** @type{qx.Promise|null} promise that resolves/rejects when the process terminates */
    __processPromise: null,

    /** @type{String|null} collected output (if `collectOutput` is true) */
    __output: null,

    /**
     * Starts the process
     */
    async start() {
      if (this.__process) {
        throw new Error("Process is already running");
      }

      let spawnArgs = {
        shell: true
      };

      if (this.getCwd()) {
        spawnArgs.cwd = this.getCwd();
      }
      let proc = child_process.spawn(this.getCommand(), this.getArguments(), spawnArgs);
      this.__processPromise = new qx.Promise();
      this.__output = this.getCollectOutput() ? "" : null;

      proc.stdout.on("data", data => this.__onConsole(data.toString(), "stdout"));
      proc.stderr.on("data", data => this.__onConsole(data.toString(), "stderr"));
      proc.on("close", ({ exitCode, signal }) => this.__onProcessTerminate(exitCode, signal));
      proc.on("error", err => this.__onProcessError(err));
      this.__process = proc;
      this.fireDataEvent("onStart", proc.pid);
    },

    /**
     * Detects whether the process is running
     *
     * @returns {Boolean}
     */
    isRunning() {
      return !!this.__process;
    },

    /**
     * Stops the process gracefully, waiting up to `shutdownGrace` milliseconds before killing it.  Silently
     * returns if the process is not running.
     */
    async stop() {
      if (!this.__process) {
        return;
      }

      let processPromise = this.__processPromise;
      await this.signal("SIGHUP");
      let stopTime = new Date().getTime() + this.getShutdownGrace();
      while (this.__process && new Date().getTime() < stopTime) {
        await zx.utils.Timeout.sleep(100);
      }
      if (this.__process) {
        await this.signal("SIGKILL");
      }
      await processPromise;
    },

    /**
     * Returns a promise that will resolve/reject when the process terminates
     *
     * @returns {Promise}
     */
    getProcessPromise() {
      return this.__processPromise;
    },

    /**
     * Returns the collected console output from the process
     *
     * @returns {String}
     */
    getOutput() {
      if (!this.getCollectOutput()) {
        throw new Error("Output collection is not enabled");
      }
      return this.__output;
    },

    /**
     * Sends a signal to the process (eg kill)
     *
     * @param {String|Number?} signal defaults to SIGTERM
     */
    async signal(signal) {
      if (!this.__process) {
        throw new Error("Process is not running");
      }
      if (!signal) {
        signal = "SIGTERM";
      }
      const psTree = qx.utils.Promisify.promisify(require("ps-tree"));
      let childProcesses = await psTree(this.__process.pid);
      for (let childProcess of childProcesses) {
        try {
          process.kill(childProcess.PID, signal);
        } catch (ex) {
          // Nothing
        }
      }
      process.kill(this.__process.pid, signal);
    },

    /**
     * Called when there is console output
     *
     * @param {String} data
     * @param {"stdout"|"stderr"} stream
     */
    __onConsole(data, stream) {
      let eventData = {
        data: data,
        stream: stream
      };
      if (this.getCollectOutput()) {
        this.__output += data;
      }
      if (this.getCopyConsoleToParent()) {
        if (stream === "stdout") {
          console.log(data);
        } else {
          console.error(data);
        }
      }
      this.fireDataEvent("onConsole", eventData);
    },

    /**
     * Called when the process terminates
     *
     * @param {Integer?} exitCode
     * @param {String?} signal
     */
    __onProcessTerminate(exitCode, signal) {
      // If the process failed with an error event, then __onProcessError will have already
      // cleared __process and resolved/rejected the promise
      let processPromise = this.__processPromise;
      if (processPromise) {
        this.__process = null;
        this.__processPromise = null;
        processPromise.resolve(exitCode);
      }
      this.fireDataEvent("onStop", exitCode);
    },

    /**
     * Called when there is an error with the process
     *
     * @param {Error} err
     */
    __onProcessError(err) {
      this.__process = null;
      let processPromise = this.__processPromise;
      this.__processPromise = null;
      processPromise.reject(err);
      this.fireDataEvent("onError", err);
    },

    /**
     * Apply method for `command`
     */
    _applyCommand(value, old) {
      if (this.__process) {
        this.warn("Changing command while process is running");
      }
    },

    /**
     * Apply method for `arguments`
     */
    _applyArguments(value, old) {
      if (this.__process) {
        this.warn("Changing arguments while process is running");
      }
    }
  }
});
