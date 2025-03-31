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
 * Represents an entity that can execute a piece of work.
 * This can be a JavaScript worker, NodeJS worker, or a docker container,
 * or a local process
 */
qx.Interface.define("zx.server.work.IWorker", {
  members: {
    /**
     * Executes the piece of work
     * @param {zx.server.work.IWork} work The piece of work to execute
     * @returns {Promise<string>} A promise that resolves with the result of the work
     */
    run(work) {},

    /**
     * Returns the JSON for the currently running work
     *
     * @returns {zx.server.work.IWork.WorkJson}
     */
    getWorkJson() {
      return this.__workJson;
    }
  }
});
