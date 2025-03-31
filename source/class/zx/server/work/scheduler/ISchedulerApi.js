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
 * Interface for a scheduler that can be polled for work and notify when work is completed.  This is
 * effectively the Server API for work schedulers.
 *
 *
 */
qx.Interface.define("zx.server.work.scheduler.ISchedulerApi", {
  events: {
    /** Fired when a work item is completed, the data is the serialized JSON from `WorkResult.serializeForScheduler` */
    workCompleted: "qx.event.type.Data"
  },

  members: {
    /**
     * Polls the queue for work to do.  If there is work to do, it is removed from the queue
     *
     * @return {zx.server.work.IWork.WorkJson?} the work to do, or null if there is no work
     */
    async pollForWork() {},

    /**
     * Called when work is completed.  This should be called by the worker pool when work is completed.
     *
     * @param {*} workResult the result of the work, serialized to JSON via `zx.server.work.WorkResult.serializeForScheduler()`
     */
    async onWorkCompleted(workResult) {}
  }
});
