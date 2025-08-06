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

/**
 * This mixin provides a simple logging mechanism.
 * The object that includes this mixin can append logs into its log buffer using `this.log`.
 * The log buffer can be retrieved using `getLogOutput`.
 */
qx.Mixin.define("zx.utils.MConsoleLog", {
  properties: {
    /**
     * If we want the log output to be printed to the console.
     */
    copyLogOutputTo: {
      init: null,
      nullable: true,
      check: ["debug", "error", "info", "log", "warn"]
    }
  },

  events: {
    /**
     * Fired when `this.log` was called
     */
    log: "qx.event.type.Data"
  },

  members: {
    /** @type {string[]} the output lines */
    __logOutput: null,

    /**
     * Pushes a lines into the output
     *
     * @param {string} str the line to add
     */
    log(str) {
      if (!this.__logOutput) {
        this.__logOutput = [];
      }
      this.__logOutput.push(str);
      let copyLogOutputTo = this.getCopyLogOutputTo();
      if (copyLogOutputTo) {
        this[copyLogOutputTo](str);
      }
      this.fireDataEvent("log", { message: str });
    },

    /**@override */
    info(str, ...args) {
      super.info(str, ...args);
      this.log(str);
    },

    /**@override */
    debug(str, ...args) {
      super.debug(str, ...args);
      this.log(str);
    },

    /**@override */
    warn(str, ...args) {
      super.warn(str, ...args);
      this.log(str);
    },

    /**@override */
    error(str, ...args) {
      super.error(str, ...args);
      this.log(str);
    },

    clearLog() {
      this.__logOutput = [];
    },

    /**
     * Returns the logged output as one string
     *
     * @returns {String}
     */
    getLogOutput() {
      return this.__logOutput ? this.__logOutput.join("\n") : "";
    }
  }
});
