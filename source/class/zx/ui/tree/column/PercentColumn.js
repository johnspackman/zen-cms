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
 *    John Spackman (john.spackman@zenesis.com, @johnspackman)
 *
 * ************************************************************************ */

qx.Class.define("zx.ui.tree.column.PercentColumn", {
  extend: zx.ui.tree.column.Column,

  construct(caption, valuePath, width) {
    super(caption, valuePath, width);
    this.setNumberFormat(new qx.util.format.NumberFormat().set({ postfix: "%" }));
  },

  properties: {
    numberFormat: {
      init: null,
      nullable: true,
      check: "qx.util.format.NumberFormat"
    }
  },

  members: {
    getDisplayValue(model) {
      var value = super.getDisplayValue(model);
      if (!value) {
        value = 0;
      }
      var nf = this.getNumberFormat();
      return nf.format(value * 100.0);
    },

    getEditedValue() {
      var str = this.getEditWidget().getValue();
      str = str.replace(/[^0-9.]/g, "");
      var value = parseFloat(str);
      return value / 100.0;
    },

    compare(left, right) {
      left = this.getRawValue(left);
      right = this.getRawValue(right);
      return left < right ? -1 : left > right ? 1 : 0;
    }
  }
});
