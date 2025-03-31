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
*    Patryk Malinowski (@p9malino26)
*    John Spackman (john.spackman@zenesis.com, @johnspackman)
*
* ************************************************************************ */



/**
 * Various utilities for working with APIs
 *
 * As rule, APIs can be defined by an interface, where that interface is named
 * in the form of "package.IName".  The name of the API is then "package.Name",
 * and server and client APIs can be instantiated by the server and client
 * respectively
 */
qx.Class.define("zx.io.api.ApiUtils", {
  type: "static",

  statics: {
    /**
     * @typedef ApiClassesCacheEntry
     * @property {qx.Class<zx.io.api.client.AbstractClientApi>} clientClass
     * @property {qx.Class<zx.io.api.server.AbstractServerApi>} serverClass
     *
     * @type {Object<String, ApiClassesCacheEntry>} map of class names to ApiClassesCacheEntry
     */
    __apiClasses: {},

    /**
     * Returns the API name from the interface
     */
    getApiNameFromInterface(apiInterface) {
      let match = apiInterface.name.match(/^(.*)\.I([^.]+)$/);
      let package = match[1];
      let name = match[2];
      return package + "." + name;
    },

    /**
     * Returns the method names implemented by the API
     */
    getMethodNamesFromInterface(apiInterface) {
      let ifcs = qx.Interface.flatten([apiInterface]);
      let methods = {};
      for (let ifc of ifcs) {
        for (let name of Object.keys(ifc.$$members)) {
          let startChar = name.charAt(0);
          if (startChar !== "_" && startChar !== "$") {
            methods[name] = true;
          }
        }
      }
      methods = Object.keys(methods);
      methods.sort();
      return methods;
    },

    /**
     * Returns the method names implemented by the API
     */
    getEventsFromInterface(apiInterface) {
      let ifcs = qx.Interface.flatten([apiInterface]);
      let events = {};
      for (let ifc of ifcs) {
        if (ifc.$$events) {
          for (let name of Object.keys(ifc.$$events)) {
            events[name] = ifc.$$events[name];
          }
        }
      }
      return events;
    },

    /**
     * Returns a new Client API instance for a given interface
     *
     * @param {*} apiInterface
     * @returns {zx.io.api.client.AbstractClientApi}
     */
    createClientApi(apiInterface, ...args) {
      let clazz = zx.io.api.ApiUtils.createClientApiClass(apiInterface);
      let clientApi = new clazz(...args);
      return clientApi;
    },

    /**
     * Returns a new Server API instance for a given interface
     *
     * @param {*} apiInterface
     * @returns {zx.io.api.server.AbstractServerApi}
     */
    createServerApi(apiInterface, ...args) {
      let clazz = zx.io.api.ApiUtils.createServerApiClass(apiInterface);
      let serverApi = new clazz(...args);
      return serverApi;
    },

    /**
     * Creates a class for the client API that implements a specific interface
     *
     * @param {qx.Interface} apiInterface
     * @returns {qx.Class<zx.io.api.client.AbstractClientApi>}
     */
    createClientApiClass(apiInterface) {
      return zx.io.api.ApiUtils.__createClasses(apiInterface).clientClass;
    },

    /**
     * Creates a class for the server API that implements a specific interface
     *
     * @param {qx.Interface} apiInterface
     * @returns {qx.Class<zx.io.api.server.AbstractServerApi>}
     */
    createServerApiClass(apiInterface) {
      return zx.io.api.ApiUtils.__createClasses(apiInterface).serverClass;
    },

    /**
     * Utility method that creates (and caches) the client and server classes for a given API interface
     *
     * @param {qx.Interface} apiInterface
     * @returns {ApiClassesCacheEntry}
     */
    __createClasses(apiInterface) {
      const ApiUtils = zx.io.api.ApiUtils;

      let classes = ApiUtils.__apiClasses[apiInterface.name];
      if (classes) {
        return classes;
      }

      let apiName = ApiUtils.getApiNameFromInterface(apiInterface);
      let methodNames = ApiUtils.getMethodNamesFromInterface(apiInterface);
      classes = {
        clientClass: null,
        serverClass: null
      };

      const AbstractClientApi = qx.Class.getByName("zx.io.api.client.AbstractClientApi");
      const AbstractServerApi = qx.Class.getByName("zx.io.api.server.AbstractServerApi");

      if (AbstractClientApi) {
        classes.clientClass = qx.Class.define(apiName + "_Client", {
          extend: AbstractClientApi,
          construct(transport, path) {
            super(transport, apiName, methodNames, path);
          },
          events: ApiUtils.getEventsFromInterface(apiInterface)
        });
      }

      if (AbstractServerApi) {
        let members = {};
        let events = ApiUtils.getEventsFromInterface(apiInterface);
        // prettier-ignore
        let serverConstructorCode = [
          `zx.io.api.server.AbstractServerApi.constructor.call(this, "${apiName}");`, 
          `this.__apiImplementation = apiImplementation;`
        ];
        const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
        for (let methodName of methodNames) {
          // prettier-ignore
          members[methodName] = new AsyncFunction(
            "...args",
            "this.fireDataEvent('" + methodName + "', ...args);\n" + 
            "if (this.__apiImplementation) \n" + 
            "  return await this.__apiImplementation." + methodName + "(...args);"
          );
          serverConstructorCode.push(`this._registerGet('${methodName}', this.${methodName});`);
          events[methodName] = "qx.event.type.Data";
        }
        if (apiInterface.$$members._publications) {
          members._publications = {};
          for (let publication in apiInterface.$$members._publications) {
            members._publications[publication] = apiInterface.$$members._publications[publication];
          }
        }

        classes.serverClass = qx.Class.define(apiName + "_Server", {
          extend: AbstractServerApi,
          construct: new Function("apiImplementation", serverConstructorCode.join("\n")),
          events,
          members
        });
      }

      ApiUtils.__apiClasses[apiInterface.name] = classes;
      return classes;
    },

    /**
     * Configures the client and server loopback transports
     */
    __initialise() {
      const ApiUtils = zx.io.api.ApiUtils;

      if (!ApiUtils.__clientTransport) {
        ApiUtils.__serverTransport = new zx.io.api.transport.loopback.LoopbackServerTransport();
        ApiUtils.__clientTransport = new zx.io.api.transport.loopback.LoopbackClientTransport();

        ApiUtils.__serverTransport.connect(ApiUtils.__clientTransport);
        ApiUtils.__clientTransport.connect(ApiUtils.__serverTransport);
      }
    },

    /**
     * Returns the server transport, connected to the client
     *
     * @returns {zx.io.api.transport.loopback.LoopbackServerTransport}
     */
    getServerTransport() {
      const ApiUtils = zx.io.api.ApiUtils;

      ApiUtils.__initialise();
      return ApiUtils.__serverTransport;
    },

    /**
     * Returns the client transport, connected to the server
     * @returns {zx.io.api.transport.loopback.LoopbackClientTransport}
     */
    getClientTransport() {
      const ApiUtils = zx.io.api.ApiUtils;

      ApiUtils.__initialise();
      return ApiUtils.__clientTransport;
    }
  }
});
