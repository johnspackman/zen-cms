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

const fs = require("fs");

/**
 * @use(zx.io.persistence.anno.Property)
 */
qx.Class.define("zx.io.remote.proxy.ClassesWriter", {
  extend: qx.core.Object,
  implement: [qx.tool.compiler.ISourceTransformer],

  properties: {
    verbose: {
      init: false,
      check: "Boolean"
    }
  },

  members: {
    /** @type {qx.tool.compiler.meta.IShadowMetaDatabaseApi} */
    __shadowMetaApi: null,

    /** @type {String} The dot template for generating proxy classes */
    __template: "",

    /**
     *
     */
    async initialise(metaDb) {
      let shadowMetaApi = qx.tool.worker.WorkerServer.getThisServerInstance().getApi(qx.tool.compiler.meta.IShadowMetaDatabaseApi);
      this.__shadowMetaApi = shadowMetaApi;
      let fname = qx.util.ResourceManager.getInstance().toUri("zx/io/remote/proxy/ProxyClass.tmpl");
      this.__template = await fs.promises.readFile(fname, "utf8");
    },

    /**
     * Returns the dot template for generating proxy classes
     * @returns {String}
     */
    getTemplate() {
      return this.__template;
    },

    /**
     * @Override
     */
    shouldTransform(sourceInfo) {
      return this.shouldBeProxied(sourceInfo.classname);
    },

    /**
     * Determines whether the given class should be proxied, based on whether it implements zx.io.remote.IProxied and any annotations
     *
     * @param {string} classname
     * @returns {boolean} Whether this class should be proxied
     */
    shouldBeProxied(classname) {
      let meta = this.__shadowMetaApi.getMetaData(classname);

      /**
       *
       * @param {string} classname
       * @returns {string[]}
       */
      const getInterfacesFlat = classname => {
        let queue = [classname];
        let out = [];
        while (queue.length > 0) {
          let current = queue.shift();
          let meta = this.__shadowMetaApi.getMetaData(current);
          if (!meta) {
            continue;
          }
          if (meta.type === "interface") {
            out.push(current);
          }
          let implements = meta.interfaces || [];
          queue.push(...implements);
          if (meta.type === "class" && meta.superClass) {
            queue.push(meta.superClass);
          }
        }
        return out;
      };

      if (classname == "zx.io.remote.IProxied") {
        return false;
      }

      let interfaces = getInterfacesFlat(classname);
      if (!interfaces.includes("zx.io.remote.IProxied")) {
        return false;
      }

      const AnnoUtil = qx.tool.compiler.meta.AnnoUtil;
      let annotations = meta.annotation?.map(AnnoUtil.evalAnno);
      if (annotations) {
        for (let anno of annotations) {
          if (anno instanceof zx.io.remote.anno.Class) {
            if (anno.getProxy() == "never") {
              return false;
            }
          }
        }
      }
      return true;
    },

    /**
     * @Override interface qx.tool.compiler.ISourceTransformer
     */
    transform(sourceInfo, source) {
      return this.generateProxy(sourceInfo.classname);
    },

    /**
     * Generates the proxy class for the given classname
     *
     * @param {string} classname
     * @returns {string} The resulting source
     */
    generateProxy(classname) {
      let writer = new zx.io.remote.proxy.ClassWriter(this, classname, this.__shadowMetaApi);
      let str = writer.getProxyClassCode();
      return str;
    }
  }
});
