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
 * Provides a simple datasource that accesses arrays of objects
 */
qx.Class.define("zx.reports.datasource.ArrayDataSource", {
  extend: zx.reports.datasource.AbstractDataSource,

  construct(objects) {
    super();
    if (!qx.lang.Type.isArray(objects)) {
      throw new Error("Expected an array of JSON objects as a datasource");
    }
    this.__objects = objects;
  },

  members: {
    /** @type{Array} array of JSON objects */
    __objects: null,

    /** @type{Integer} current index */
    __index: -1,

    async open() {
      await super.open();
      this.__index = -1;
    },

    /**
     * @Override
     */
    _nextImpl() {
      if (this.__index == this.__objects.length - 1) {
        return false;
      }

      this.__index++;
      return true;
    },

    /**
     * @Override
     */
    current() {
      if (this.__index < 0 || this.__index > this.__objects.length - 1) {
        return null;
      }
      if (this.__objects.getItem) {
        return this.__objects.getItem(this.__index);
      }
      return this.__objects[this.__index];
    }
  }
});
