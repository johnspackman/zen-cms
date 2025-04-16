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

qx.Class.define("zx.utils.Target", {
  extend: qx.core.Object,

  construct(callback, context) {
    super();
    if (context) {
      callback = callback.bind(context);
    }
    this.__callback = callback;
  },

  properties: {
    value: {
      init: null,
      nullable: true,
      event: "changeValue",
      apply: "_applyValue"
    }
  },

  members: {
    __callback: null,

    _applyValue(value, oldValue) {
      if (this.__callback) {
        this.__callback(value, oldValue);
      }
    },

    bindTo(obj, path) {
      this.bind("value", obj, path);
      return this;
    }
  },

  statics: {
    bindEvent(object, path, eventName, cb, context) {
      var target = new zx.utils.Target(function (value, oldValue) {
        let listenerId = target.getUserData("bindEvent.listenerId");
        if (listenerId) {
          oldValue.removeListenerById(listenerId);
          target.setUserData("bindEvent.listenerId", null);
        }
        if (value) {
          let listenerId = value.addListener(eventName, cb, context);
          target.setUserData("bindEvent.listenerId", listenerId);
        }
      });
      object.bind(path, target, "value");
      return target;
    }
  }
});
