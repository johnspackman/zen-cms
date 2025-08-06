/**
 *
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
     * @property {zx.server.work.WorkerTracker.DescriptionJson[]} runningWorkerTrackers
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
