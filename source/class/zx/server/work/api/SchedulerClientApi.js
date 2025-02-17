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
 *    Will Johnson (@willsterjohnson)
 *
 * ************************************************************************ */

/**
 * This API is used by the pool (zx.server.work.AbstractWorkerPool) to communicate with the scheduler (zx.server.work.api.SchedulerServerApi),
 * and used for receiving work and uploading infornamtion regarding the status of the work.
 *
 */
qx.Class.define("zx.server.work.api.SchedulerClientApi", {
  extend: zx.io.api.client.AbstractClientApi,

  /**
   *
   * @param {zx.io.api.server.AbstractServerTransport} transport
   * @param {string} path
   */
  construct(transport, path) {
    super(transport, "zx.server.work.api.SchedulerApi", ["schedule", "poll", "push"], path);
  }
});
