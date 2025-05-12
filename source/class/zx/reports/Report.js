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

qx.Class.define("zx.reports.Report", {
  extend: zx.reports.Group,

  construct(each) {
    super();
    if (each) {
      this.setEach(each);
    }
  },

  properties: {
    /**
     * If set, these CSV headers will be shown
     * at the very beginning of the CSV output
     * and anything in the `before` blocks of any group will be ignored.
     */
    csvHeaders: {
      check: "Array",
      nullable: true,
      event: "changeCsvHeaders"
    }
  }
});
