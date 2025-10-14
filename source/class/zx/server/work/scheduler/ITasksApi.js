/**
 * API used for searching and managing scheduled tasks.
 */
qx.Interface.define("zx.server.work.scheduler.ITasksApi", {
  members: {
    /**
     * Queues a task for execution.
     * @param {string} uuid
     */
    async queueTask(uuid) {},

    /**
     *
     * @param {Query} query
     * @returns {Promise<zx.server.work.scheduler.ScheduledTask.DescriptionJson[]>}
     *
     * @typedef Query
     * @property {string?} text - Text search
     * @property {string?} uuid - The UUID of the task to search for
     * @property {boolean?} runningOnly - If true, includes only tasks which are either queued or running.
     * @property {number?} maxResults - The maximum number of results to return. If not specified, all results are returned.
     * If runningOnly is true, this will be ignored and all running tasks will be returned.
     */
    async searchTasks(query) {},

    /**
     * Tries to see if a work given task UUID is running,
     * and if so, returns the work result for that work.
     * Note: even if a task is marked as running in its description JSON, it may take a few seconds until the work result becomes available in the pool.
     *
     * @param {string} taskUuid uuid of `zx.server.work.scheduler.ScheduledTask`
     * @returns {Promise<zx.server.work.WorkResult.WorkResultJson|null>} the work result for the given work UUID if that work is running, or null if it is not
     */
    async getRunningWorkResult(taskUuid) {},

    /**
     * Gets the past work results for a given task UUID.
     * @param {string} taskUuid UUID of `zx.server.work.scheduler.ScheduledTask
     * @returns {Promise<zx.server.work.WorkResult.WorkResultJson[]>} an array of past work results for the given task UUID
     */
    async getPastWorkResults(taskUuid) {}
  }
});
