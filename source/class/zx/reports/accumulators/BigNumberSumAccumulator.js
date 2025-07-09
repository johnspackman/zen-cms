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
 * @ignore(BigNumber)
 */
qx.Class.define("zx.reports.accumulators.BigNumberSumAccumulator", {
  extend: qx.core.Object,
  implement: [zx.reports.accumulators.IAccumulator],

  /**
   *
   * @param {string} columnName
   */
  construct(columnName, negate) {
    super();
    this.__valueAccessor = zx.reports.Utils.compileGetter(columnName);
    if (negate !== undefined) {
      this.setNegate(negate);
    }
  },

  properties: {
    sum: {
      init: new BigNumber(0),
      check: "BigNumber",
      event: "changeSum"
    },

    negate: {
      check: "Boolean",
      init: false,
      event: "changeNegate"
    }
  },

  members: {
    /** @type{Function} the accessor for the column */
    __valueAccessor: null,

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
      let value = this.__valueAccessor(ds);
      if (this.isNegate()) {
        value = value.negated();
      }
      this.setSum(this.getSum().plus(value));
    }
  }
});
