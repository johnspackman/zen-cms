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
 * Represents a piece of work to be executed by an instance of zx.server.work.IWorker

  @typedef {Object} WorkJson Object describing the work
  @property {string} workClassname Name of this instance of `zx.server.work.IWork`
    that is going to run

  @property {string} uuid Unique identifier for this work item
    The instance of `zx.server.work.IWork` will have its UUID set to this

  @property {string} title
  @property {string} description    
  @property {Array} args Arguments to pass into constructor of `zx.server.work.IWork`
 */
qx.Interface.define("zx.server.work.IWork", {
  members: {
    /**
     * Executes the work
     *
     * @param {zx.server.work.IWorker} worker the Worker that is executing this Work
     * @returns {Promise<>} A promise that resolves when the work is complete
     */
    async execute(worker) {},

    /**
     * Attempts to cleanly shut down the work
     * Can be called when we are in the middle of execute.
     * @param {zx.server.work.IWorker} worker
     */
    async abort(worker) {}
  }
});
