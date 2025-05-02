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

qx.Class.define("zx.reports.accumulators.BigNumberSumAccumulator", {
  extend: qx.core.Object,
  implement: [zx.reports.accumulators.IAccumulator],

  /**
   *
   * @param {string} columnName
   */
  construct(columnName) {
    super();
    this.__columnName = columnName;
  },

  properties: {
    sum: {
      init: new BigNumber(0),
      check: "BigNumber",
      event: "changeSum"
    }
  },

  members: {
    /** @type{String} the name of the column to count*/
    __columnName: null,

    /**
     * @override
     */
    reset(ds) {
      this.resetSum();
    },

    /**
     * @override
     */
    update(ds) {
      let value = ds.get(this.__columnName);
      this.setSum(this.getSum().plus(value));
    }
  }
});
