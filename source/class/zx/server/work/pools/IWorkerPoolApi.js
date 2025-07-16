/**
 *
 * @typedef RunningWorkInfo
 * @property {zx.server.work.IWork.WorkJson} workJson the work that is running
 * @property {Date} started the date when the work started
 * @property {Date} lastPing the date when the worker last pinged the pool
 * @property {String} consoleOutput
 *
 */
qx.Interface.define("zx.server.work.pools.IWorkerPoolApi", {
  members: {
    /**
     *
     * @returns {Promise<WorkerPoolDescription>} Information about all the current work that is running
     *
     * @typedef PoolInfo
     * @property {string} uuid - the UUID of this WorkerPool
     * @property {string} classname - the classname of this WorkerPool
     * @property {string} apiPath - the API path for this WorkerPool
     *
     * @typedef WorkerPoolDescription @extends PoolInfo
     * @property {zx.server.work.WorkResult.Description[]} runningWork - an array of WorkResult descriptions for the work that is currently running
     */
    async getDescriptionJson() {},

    /**
     *
     * Kills the work with the given UUID
     * @param {string} uuid
     */
    async killWork(uuid) {}
  }
});
