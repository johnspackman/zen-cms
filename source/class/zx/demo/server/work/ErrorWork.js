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
 *    Patryk Malinowski (@p9malino26)
 *
 * ************************************************************************ */

qx.Class.define("zx.demo.server.work.ErrorWork", {
  extend: qx.core.Object,
  implement: zx.server.work.IWork,

  members: {
    /**
     * @override
     */
    async execute(worker) {
      worker.appendWorkLog("I'm about to throw an exception!");
      throw new Error("oops");
    },

    /**@override*/
    async abort(worker) {}
  }
});
