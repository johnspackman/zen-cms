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
 * Helper functions to convert data that has been returned from Mongo into read-only Qooxdoo objects.
 * These objects behave in the exact same way as server objects, but changes to them aren't saved in the database.
 *
 * Useful when we want Qooxdoo objects but don't want to instantiate full server objects
 * because doing that is expensive.
 */
qx.Class.define("zx.utils.marshal.Marshal", {
  statics: {
    /**@type {qx.data.marshal.Json} */
    __marhsaller: null,

    /**
     * Converts an array of POJOs representing server objects to Qooxdoo objects.
     * Each object will have a method toUuid().
     *
     * @param {Object[] | qx.data.Array<Object>} obj Array of POJOs
     * @return {qx.data.Array<qx.core.Object>} Array of Qooxdoo objects
     */
    toProxies(obj, includeClientMixins = false) {
      let proxies = zx.utils.marshal.Marshal.__doit(obj);
      if (includeClientMixins) {
        for (let proxy of proxies) {
          zx.utils.marshal.Marshal.__includeMixinsForProxy(proxy);
        }
      }
      return proxies;
    },

    /**
     * Converts a POJO representing a server object to a Qooxdoo object.
     * The returned object will have a method toUuid().
     *
     * @param {Object} obj
     * @return {qx.core.Object}
     */
    toProxy(obj, includeClientMixins = false) {
      let proxy = zx.utils.marshal.Marshal.__doit(obj);
      if (includeClientMixins) {
        zx.utils.marshal.Marshal.__includeMixinsForProxy(proxy);
      }
      return proxy;
    },

    /**
     * Converts a POJO or array of POJOs representing server objects to Qooxdoo objects.
     * If an array of POJOs is passed, the result will be a qx.data.Array of Qooxdoo objects.
     *
     * Each object will have a method toUuid().
     *
     * @param {Object | Object[] | qx.data.Array<Object>} obj POJO or array of POJOs
     * @return {qx.core.Object | qx.data.Array<qx.core.Object>} Qooxdoo object or array of Qooxdoo objects
     */
    __doit(obj) {
      if (obj instanceof qx.data.Array) {
        obj = obj.toArray();
      }

      if (!zx.utils.marshal.Marshal.__marshaller) {
        const delegate = {
          getModelMixins() {
            return zx.utils.marshal.MServerObjectProxy;
          }
        };
        zx.utils.marshal.Marshal.__marshaller = new qx.data.marshal.Json(delegate);
      }
      let marshaller = zx.utils.marshal.Marshal.__marshaller;
      marshaller.toClass(obj);
      obj = marshaller.toModel(obj, false);

      return obj;
    },

    /**
     * Makes the proxy class include any mixins that the server object includes.
     * @param {qx.core.Object} proxy
     * @returns
     */
    __includeMixinsForProxy(proxy) {
      let clazz = qx.Class.getByName(proxy.get_classname());
      if (!clazz.$$includes) return;
      for (let mixin of clazz.$$includes) {
        qx.Class.patch(proxy.constructor, mixin);
      }
      return;
    }
  }
});
