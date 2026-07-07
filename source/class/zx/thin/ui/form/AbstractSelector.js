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

qx.Class.define("zx.thin.ui.form.AbstractSelector", {
  extend: qx.html.Element,
  type: "abstract",

  construct(caption, icon) {
    super();
    if (caption) {
      this.setCaption(caption);
    }
    this.initValue();

    this._createInput();
    this.add(this.getQxObject("caption"));

    this.addListener("pointerup", this.__onPointerUp, this);
    let input = this.getQxObject("input");
    input.addListener("focus", () => this.addClass("qx-widget-focus"));
    input.addListener("blur", () => this.removeClass("qx-widget-focus"));
  },

  properties: {
    /** Caption */
    caption: {
      init: null,
      nullable: true,
      check: "String",
      apply: "_applyCaption"
    },

    /** The value on the actual `<input>` tag that will be posted in a form POST, ie the `value` attribute */
    formValue: {
      init: null,
      nullable: true,
      check: "String",
      apply: "_applyFormValue"
    },

    /** The name on the actual `<input>` tag that will be posted in a form POST */
    name: {
      init: null,
      nullable: true,
      check: "String",
      apply: "_applyName"
    },

    /** This is true or false depending on whether this selector control is checked or not. */
    value: {
      init: false,
      check: "Boolean",
      apply: "_applyValue",
      event: "changeValue"
    }
  },

  members: {
    _applyCaption(value) {
      this.getQxObject("caption").setText(value || "");
    },

    _applyValue(value) {
      this.getQxObject("input").setAttribute("checked", value);
      if (value) {
        this.addClass("qx-selector-on");
        this.removeClass("qx-selector-off");
      } else {
        this.addClass("qx-selector-off");
        this.removeClass("qx-selector-on");
      }
    },

    _applyFormValue(value) {
      this.getQxObject("input").setAttribute("value", value);
    },

    _applyName(value) {
      this.getQxObject("input").setAttribute("name", value);
    },

    _onInputChange(evt) {
      let checked = this.getQxObject("input").getDomElement().checked;
      this.setValue(checked);
    },

    __onPointerUp(evt) {
      let input = this.getQxObject("input");
      input.focus();
      this.setValue(!this.getValue());
    },

    _createInput() {
      throw new Error(`No implementation of ${this.classname}._createInput`);
    },

    _createQxObjectImpl(id) {
      switch (id) {
        case "input":
          throw new Error(`No implementation of widget with qxObjectId ${id} in ${this.classname}`);

        case "caption":
          return <label></label>;
      }

      return super._createQxObjectImpl(id);
    }
  }
});
