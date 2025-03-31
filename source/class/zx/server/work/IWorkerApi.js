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
 *    John Spackman (@johnspackman)
 *
 * ************************************************************************ */

/**
 * Interface for the Worker API
 */
qx.Interface.define("zx.server.work.IWorkerApi", {
  members: {
    /**
     * @override
     */
    _publications: {
      /**
       * Sent when a work logs a message
       * @type {object}
       * @prop {string} caller uuid of the work which called the log
       * @prop {string} message log message
       */
      log: true,

      /**
       * Send when a worker pings the pool,
       * to show that it's still alive
       */
      ping: true,

      /**
       * Sent when a work completes, whether successfully or not
       * @type {object}
       * @prop {string} caller uuid of the work which completed
       * @prop {boolean} success `true` if the completion was a safe return, `false` if the completion was an error
       * @prop {string} message return message for a successful completion, or an error message for an unsuccessful completion
       */
      complete: true
    },

    /**
     * Executes the piece of work
     * @param {zx.server.work.IWork} work The piece of work to execute
     * @returns {Promise<string>} A promise that resolves with the result of the work
     */
    run(work) {},

    /**
     * Sets the URL for the Chromium instance
     * @param {String} url
     */
    setChromiumUrl(url) {},

    /**
     * Sets the data mounts, each is in the from of an array "alias:path"
     *
     * @param {String[]} dataMounts
     */
    setDataMounts(dataMounts) {},

    /**
     * Called to shutdown the worker process
     */
    shutdown() {}
  }
});
