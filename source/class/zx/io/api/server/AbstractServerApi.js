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

const path = require("path");
/**
 * Abstract class for server-side API
 * Implement methods here that can be called from the client
 * @typedef {"GET" | "POST" | "PUT" | "DELETE"} RestMethod
 */
qx.Class.define("zx.io.api.server.AbstractServerApi", {
  extend: qx.core.Object,
  type: "abstract",

  /**
   *
   * @param {string} apiName Name of API, which must be the same as the corresponding client-side API class
   */
  construct(apiName) {
    super();
    this.__apiName = apiName;
    this.__restsByPath = {};
  },

  members: {
    /**
     * A map of publication names.
     * The values may take any shape (other than `undefined`), though it is recommended for purposes of documentation to
     * use the literal `true`, and use a JSDoc comment to describe the shape of the data for that publication.
     * Override this field in your implementation to define the publications that this API can publish
     * @type {{ [publicationName: string]: any }}
     */
    _publications: null,

    /**
     * @type {string}
     */
    __path: null,

    /**
     * @type {string}
     */
    __apiName: null,

    /**
     * Called EXCLUSIVELY by zx.io.api.server.ConnectionManager.registerApi
     * Sets the path at which this API is registered
     * @param {string} path
     */
    setPath(path) {
      this.__path = path;
    },

    /**
     * @returns {string}
     */
    getApiName() {
      return this.__apiName;
    },

    /**
     * @typedef {{[restName: RestMethod]: string}} MethodsByRest Maps the HTTP rest method to the server method
     * @type {{[path: string]: MethodsByRest}}
     */
    __restsByPath: null,

    /**
     * Called EXCLUSIVELY by the connection manager (zx.io.api.server.ConnectionManager) when a message is received from the client.
     * Does the appropriate action, e.g. calling a method or subscribing to a publication,
     * and populates the response object
     * @param {zx.io.api.server.Request} request
     * @param {zx.io.api.server.Response} response
     */
    async receiveMessage(request, response) {
      let type = request.getType();

      if (qx.core.Environment.get("qx.debug")) {
        this.assertTrue(response.getData().length === 0, "Response data must be empty before calling receiveMessage");
      }

      let responseData;
      if (type == "callMethod") {
        await this.__callMethod(request, response);
        responseData = response.getData()[0];
      } else if (type == "subscribe") {
        responseData = this.__subscribe(request);
        response.addData(responseData);
      } else if (type == "unsubscribe") {
        responseData = this.__unsubscribe(request);
        response.addData(responseData);
      } else {
        throw new Error(`Unknown message type: ${type}`);
      }

      if (request.isFromClientApi()) {
        responseData.headers["Api-Name"] = this.getApiName();
        responseData.headers["Server-Api-Uuid"] = this.toUuid();
        responseData.headers["Client-Api-Uuid"] = request.getHeader("Client-Api-Uuid");
      }
    },

    /**
     * Calls a method on the server API
     *
     * @param {zx.io.api.server.Request} request
     * @param {zx.io.api.server.Response} response
     */
    async __callMethod(request, response) {
      if (request.isFromClientApi()) {
        await this.__callMethodFromApi(request, response);
      } else {
        await this.__callMethodFromRest(request, response);
      }
    },

    /**
     *
     * @param {zx.io.api.server.Request} request
     * @param {zx.io.api.server.Response} response
     */
    async __callMethodFromRest(request, response) {
      function pathToRegex(path) {
        path = path.replace(/\{/g, "(?<");
        path = path.replace(/\}/g, ">[^/]+)");
        path = `^${path}$`;
        return path;
      }

      let requestMethodPath;
      if (this.__path) {
        requestMethodPath = path.relative(this.__path, request.getPath());
      } else {
        const PREFIX = `/${zx.io.api.server.AbstractServerApi.GLOBAL_API_PREFIX}/${this.getApiName()}`;
        requestMethodPath = path.relative(PREFIX, request.getPath());
      }

      let handler;
      //Try to find a method that has been registered for REST
      for (let [methodPath, methodByRest] of Object.entries(this.__restsByPath)) {
        let rgx = new RegExp(pathToRegex(methodPath));
        let match = requestMethodPath.match(rgx);
        if (match) {
          let pathArgs = match.groups ?? {};
          request.setPathArgs(pathArgs);
          handler = methodByRest[request.getRestMethod()];
          break;
        }
      }

      let returnData;
      if (handler) {
        returnData = await handler.call(this, request, response);
      } else {
        //If no REST handle found, try to call the method directly, with request and response as arguments
        if (!this[requestMethodPath]) {
          throw new Error(`Unable to find REST-suitable method in api ${this.getApiName()}, request path: ${request.getPath()}`);
        }

        returnData = await this[requestMethodPath](request, response);
      }

      //If the method returned something, add it to the response
      if (returnData) {
        response.addData(returnData);
      }
    },

    /**
     *
     * @param {zx.io.api.server.Request} request
     * @param {zx.io.api.server.Response} response
     */
    async __callMethodFromApi(request, response) {
      let requestMethodPath = request.getPath().split("/").at(-1);

      //Client API handler
      let result;
      let error;
      try {
        result = await this[requestMethodPath](...request.getBody().methodArgs);
      } catch (e) {
        error = e;
        this.error(`Error calling method ${requestMethodPath} in API ${this.getApiName()}: ${e}`);
      }
      response.addData({
        type: "methodReturn",
        headers: {
          "Call-Index": request.getHeaders()["Call-Index"]
        },
        body: {
          methodResult: result,
          error: error?.toString() ?? null
        }
      });
    },

    /**
     * @typedef {(req: zx.io.api.server.Request, res: zx.io.api.server.Response) => (void | Promise<void>)} RestHandler

     * @param {RestMethod} restMethod
     * @param {string} path The path at which the method will be mounted
     * @param {[methodName: string] | [func: RestHandler, context: any]} args Either a method name or a function with a context
     * If a method name is provided, the method must exist in the instance of this API
     *
     * Makes a method able to be called via REST.
     * During the REST call, the method will be called with the request and response objects as arguments
     */
    __registerMethodRest(restMethod, path, ...args) {
      if (qx.core.Environment.get("qx.debug")) {
        if (path.startsWith("/")) {
          throw new Error(`Error resistering method at path ${path}. Path must be relative and must not start with a forward slash`);
        }
      }

      //This will be the handler for the REST call that will be called with the request and response objects
      let handler;

      if (typeof args[0] == "string") {
        //this means it's a method name
        let methodName = args[0];
        if (!this[methodName]) {
          throw new Error(`Method ${methodName} not found in API ${this.getApiName()}`);
        }
        handler = (req, res) => this[methodName](req, res);
      } else {
        //this means it's a function with a context
        let func = args[0];
        let context;
        handler = func;
        if (args.length > 1) {
          context = args[1];
          handler = handler.bind(context);
        }
      }

      this.__restsByPath[path] ??= {};
      this.__restsByPath[path][restMethod] = handler;
    },

    /**
     * Call either of the four methods below to register a method to be called via REST
     * @param {string} path
     * @param  {...any} args
     */
    _registerGet(path, ...args) {
      this.__registerMethodRest("GET", path, ...args);
    },

    _registerPost(path, ...args) {
      this.__registerMethodRest("POST", path, ...args);
    },

    _registerPut(path, ...args) {
      this.__registerMethodRest("PUT", path, ...args);
    },

    _registerDelete(path, ...args) {
      this.__registerMethodRest("DELETE", path, ...args);
    },

    /**
     * Removes a subscription from a particular event
     * @param {zx.io.api.server.Request} request
     * @returns {Promise<zx.io.api.IResponseJson.IResponseData>}
     */
    __unsubscribe(request) {
      let eventName = request.getBody().eventName;
      let session = request.createSession();
      let clientApiUuid = request.getHeader("Client-Api-Uuid");
      session.removeSubscription(this, clientApiUuid, eventName);
      let responseData = {
        headers: {
          "Session-Uuid": session.toUuid()
        },
        type: "unsubscribed",
        body: {
          eventName
        }
      };

      return responseData;
    },

    /**
     * Creates a subscription for a particular event
     * @param {zx.io.api.server.Request} request
     * @returns {Promise<zx.io.api.IResponseJson.IResponseData>}
     */
    __subscribe(request) {
      let eventName = request.getBody().eventName;
      let session = request.createSession();
      let clientApiUuid = request.getHeader("Client-Api-Uuid");
      session.addSubscription(this, clientApiUuid, eventName);
      let responseData = {
        headers: {
          "Session-Uuid": session.toUuid()
        },
        type: "subscribed",
        body: {
          eventName
        }
      };

      return responseData;
    },

    /**
     * Call this method to publish all subscribed clients of an event
     * @param {string} eventName
     * @param {any} data
     */
    publish(eventName, data) {
      if (this._publications[eventName] === undefined) {
        this.warn(`Server API ${this.toString()} attempts to publish "${eventName}" but it is not defined in the _publications field.`);
        debugger;
      }
      zx.io.api.server.SessionManager.getInstance()
        .getAllSessions()
        .forEach(session => {
          this.trace(`Publishing ${eventName} to ${session}`);
          session.publish(this, eventName, data);
        });
    }
  },

  statics: {
    GLOBAL_API_PREFIX: "__globalApis"
  }
});
