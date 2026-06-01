/**
 *
 *
 */
qx.Interface.define("zx.server.work.pools.IWorkerPoolApi", {
  members: {
    /**
     * @param {boolean?false} includeLogs Whether to include logs in the description JSON.
     * @returns {Promise<WorkerPoolDescription>} Information about all the current work that is running
     *
     * @typedef PoolInfo
     * @property {string} uuid - the UUID of this WorkerPool
     * @property {string} classname - the classname of this WorkerPool
     * @property {string} apiPath - the API path for this WorkerPool
     *
     * @typedef WorkerPoolDescription @extends PoolInfo
     * @property {zx.server.work.WorkerTracker.DescriptionJson[]} runningWorkerTrackers
     */
    async getDescriptionJson(includeLogs = false) {},

    /**
     *
     * Kills the work with the given UUID
     * @param {string} uuid
     */
    async killWork(uuid) {}
  }
});
