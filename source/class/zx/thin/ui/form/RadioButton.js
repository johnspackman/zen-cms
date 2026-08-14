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

qx.Class.define("zx.thin.ui.form.RadioButton", {
  extend: zx.thin.ui.form.AbstractSelector,

  properties: {
    /** Refine the main CSS class */
    cssClass: {
      init: "qx-radio",
      refine: true
    }
  },

  members: {
    _createInput() {
      this.add(this.getQxObject("input"));
      this.add(this.getQxObject("outer"));
      this.add(this.getQxObject("inner"));
    },

    _applyValue(value, oldValue) {
      super._applyValue(value, oldValue);
      if (value) {
        this.__turnOffOtherRadios();
      }
    },

    _onInputChange(evt) {
      super._onInputChange(evt);
      if (this.getDomElement().checked) {
        this.__turnOffOtherRadios();
      }
    },

    __turnOffOtherRadios() {
      let name = this.getName() || "";
      let query = `input[type=radio]`;
      if (name) {
        query += `[name=${name}]`;
      }
      let doms = qx.bom.Selector.query(query);
      doms.forEach(dom => {
        let element = qx.html.Node.fromDomNode(dom);
        if (element) {
          let radio = element.getQxOwner();
          if (radio != this) {
            radio.setValue(false);
          }
        }
      });
    },

    _createQxObjectImpl(id) {
      switch (id) {
        case "input":
          var wid = <input type="radio"></input>;
          wid.addListener("click", this._onInputChange, this);
          return wid;

        case "outer":
          return <div class="qx-radio-outer"></div>;

        case "inner":
          return <div class="qx-radio-inner"></div>;
      }

      return super._createQxObjectImpl(id);
    }
  }
});
