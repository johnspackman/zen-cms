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

qx.Class.define("zx.demo.server.work.TestWork", {
  implement: zx.server.work.IWork,
  extend: qx.core.Object,

  /**
   *
   * @param {integer} iterations
   */
  construct(iterations = 3) {
    super();
    this.__iterations = iterations;
  },

  members: {
    /**
     * @override
     */
    async execute(worker) {
      console.log("the task is running!");
      worker.appendWorkLog("Hello, World!");
      worker.appendWorkLog("Lorem ipsum dolor sit amet, consectetur adipiscing elit.");

      for (let i = 0; i < this.__iterations; i++) {
        worker.appendWorkLog(`${this.toUuid().split("-")[0]} Doing thing ${i}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      // TODO: anything!
      return "success!";
    },

    /**@override*/
    async abort(worker) {}
  }
});
