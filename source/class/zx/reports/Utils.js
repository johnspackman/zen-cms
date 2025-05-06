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

qx.Class.define("zx.reports.Utils", {
  type: "static",
  statics: {
    /**
     * Creates a function that will return the value of a property from an object; the path can be
     * a dot-separated string of properties, eg "foo.bar.baz", or a function
     *
     * @param {String|Function?} path
     * @returns {Function}
     */
    compileGetter(path) {
      if (path instanceof Function) {
        return path;
      }
      if (!path) {
        return new Function("return null;");
      }
      if (path == ".") {
        return new Function("return this;");
      }
      let parts = path.split(".");
      let upnames = parts.map(part => qx.lang.String.firstUp(part));
      return function (obj) {
        if (obj == null) {
          return null;
        }
        for (let i = 0; i < parts.length; i++) {
          if (obj === null || obj === undefined) {
            return null;
          }
          if (parts[i] == "_uuid") {
            if (obj instanceof qx.core.Object) {
              return obj.toUuid();
            }
            return obj._uuid || obj.uuid;
          }
          if (obj instanceof qx.core.Object) {
            obj = obj["get" + upnames[i]]();
          } else {
            obj = obj[parts[i]];
          }
        }
        return obj;
      };
    },

    /**
     * Returns the value of a property from an object, where the property is a path
     *
     * @param {Object} obj
     * @param {String} path
     * @return {Object}
     */
    getValue(obj, path) {
      if (!path) {
        return obj;
      }
      let parts = path.split(".");
      for (let i = 0; i < parts.length; i++) {
        if (obj == null) {
          return null;
        }
        obj = obj[parts[i]];
      }
      return obj;
    }
  }
});
