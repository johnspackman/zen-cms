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
 * Base class for client-side API implementations
 *
 * @typedef {Object} MethodConfig Configuration for a method in the API
 */
qx.Class.define("zx.io.api.client.AbstractClientApi", {
  type: "abstract",
  extend: qx.core.Object,

  /**
   *
   * @param {zx.io.api.client.AbstractClientTransport} transport The transport object that this API class sends and receives data
   *
   * @param {string[] | { [methodName: string]: MethodConfig }} methodNames
   * Either: Names of the methods that are defined in the corresponding server API class.
   * Or: An object mapping method names to their configurations.
   *
   * @param {string?} path The path to mount this API. If provided, calls from this API will target the API registed on the server at this path.
   */
  construct(transport, apiName, methodNames, path = null) {
    super();
    //uses of this class
    this.__path = path;
    this.__transport = transport;
    this.__apiName = apiName;
    this.__cookies = {};
    this.__pendingMethodCalls = {};
    this.__transport.addListener("message", this.__onMessage, this);
    this.__methodConfigs = {};
    this.__subscriptions = {};

    if (methodNames) {
      if (qx.lang.Type.isArray(methodNames)) {
        methodNames.forEach(methodName => this.__addMethod(methodName));
      } else {
        for (let methodName in methodNames) {
          this.__addMethod(methodName, methodNames[methodName]);
        }
      }
    }
  },

  destruct() {
    this.terminate();
  },

  members: {
    __terminated: false,

    /**
     * @type {string}
     */
    __path: null,

    /**
     * @typedef {{callbacks: ((eventData: any) => void)[], promise: qx.Promise?}} SubscriptionData The promise is created when the client requests subscribe,
     * and resolved when the client receives a message from the server that it has subscribed to the event.
     * A promise is created and used in the same way when the user unsubscribes.
     * The callback is called when the server publishes the event.
     * @type {{[eventName: string]: SubscriptionData}}
     *
     * A map mapping event names for subscriptions to their callbacks
     */
    __subscriptions: null,

    /**
     * @type {zx.io.api.client.AbstractClientTransport}
     */
    __transport: null,

    /**
     * @interface PendingMethodCall Data representing a call for a server method that we are waiting for a response for
     * @property {qx.Promise} promise A promise that will be resolved when the server responds to the method call
     * @property {number} callIndex A unique identifier for the call
     * @property {string} methodName Name of method in the server API class
     * @property {any[]} methodArgs Arguments passed to server method
     *
     * @type {Map<number, PendingMethodCall>}
     */
    __pendingMethodCalls: null,

    /**
     * The call index of the last method call that was made.
     * If no calls have been made yet, it's 0.
     */
    __pendingMethodCallIndex: 0,

    /**
     * @type {Object}
     */
    __cookies: null,

    /**
     * @type {[methodName: string]: Object}
     * A map storing the configuration for each method in the API.
     */
    __methodConfigs: null,

    /**
     * @type {string}
     */
    __apiName: null,

    /**
     * Terminates the client API, rejecting all pending subscriptions and method calls
     * Note: This does not clear the session data on the server ATM
     */
    terminate() {
      if (this.__terminated) {
        return;
      }

      //reject pending subscriptions
      for (let [eventName, subData] of Object.entries(this.__subscriptions)) {
        if (subData.promise) {
          subData.promise.reject(new Error(`Client API terminated - subscription ${this.classname}.${eventName}`));
        }
        this.__transport.unsubscribe();
      }

      //reject pending method calls
      for (let pending of Object.values(this.__pendingMethodCalls)) {
        let promise = pending.promise;
        pending.promise = null;
        promise.reject(new Error(`Client API terminated - method ${this.classname}.${pending.methodName}`));
      }

      //Disconnect from the transport
      this.__transport.removeListener("message", this.__onMessage, this);
      this.__terminated = true;
    },

    /**
     *
     * @returns {string} Name of the API, common to both client and server API classes
     */
    getApiName() {
      return this.__apiName;
    },

    /**
     * Creates a subscription to a publication fired by the server API

     * NOTE: You must await this method the first time you call it in a client API instance,
     * otherwise it will cause problems with session tracking.
     * 
     * @param {string} eventName
     * @param {(data: any) => void} callback
     * @param {object} context - if provided, the callback will be replaced; `callback.bind(context)`
     * @returns {qx.Promise<boolean>} A promise that will be resolved with true when the subscription succeeded or false when failed.
     * A subscription can fail if we lose connection to the server.
     */
    subscribe(eventName, callback, context) {
      if (this.__terminated) {
        this.error("Client API is terminated");
        return;
      }

      if (context) {
        callback = callback.bind(context);
      }
      if (this.__subscriptions[eventName]) {
        this.__subscriptions[eventName].callbacks.push(callback);
        return;
      }

      let headers = {
        "Client-Api-Uuid": this.toUuid()
      };

      if (!this.__path) {
        headers["Api-Name"] = this.__apiName;
      }

      if (this.__transport.getSessionUuid()) {
        headers["Session-Uuid"] = this.__transport.getSessionUuid();
      }

      let promise = new qx.Promise();
      let callbacks = new qx.data.Array([callback]);
      this.__subscriptions[eventName] = { callbacks, promise };

      Promise.resolve()
        .then(() =>
          this.__transport.postMessage(this.__path, {
            type: "subscribe",
            headers,
            path: this.__path,
            body: {
              eventName
            }
          })
        )
        .catch(e => {
          promise.reject(e);
        });

      return promise;
    },

    async whenNextSubscriptionFired(publishName) {
      let promise = new qx.Promise();
      const cb = evt => {
        this.unsubscribe(publishName, cb);
        promise.resolve(evt);
      };
      await this.subscribe(publishName, cb);
      await promise;
    },

    /**
     * Removes a subscription from a publication fired by the server API
     * @param {string} eventName
     * @param {(data: any) => void} callback
     */
    unsubscribe(eventName, callback) {
      if (this.__terminated) {
        this.error("Client API is terminated");
        return;
      }
      let { callbacks } = this.__subscriptions[eventName];
      if (callback) {
        callbacks.remove(callback);
      } else {
        callbacks.removeAll();
      }

      let promise = new qx.Promise();

      if (callbacks.length == 0) {
        this.__subscriptions[eventName].promise = promise;
        let request = {
          type: "unsubscribe",
          headers: {
            "Api-Name": !this.__path ? this.__apiName : undefined,
            "Client-Api-Uuid": this.toUuid(),
            "Session-Uuid": this.__transport.getSessionUuid()
          },
          body: {
            eventName
          }
        };
        this.__transport.unsubscribe();

        Promise.resolve()
          .then(() => this.__transport.postMessage(this.__path, request))
          .catch(e => {
            promise.reject(e);
          });
      } else {
        promise.resolve();
      }

      return promise;
    },

    /**
     * Adds a remote method
     *
     * @param {String} methodName
     * @param {MethodConfig} methodConfig
     */
    __addMethod(methodName, methodConfig) {
      if (typeof methodName != "string" && !methodConfig && typeof methodName.methodName == "string") {
        methodConfig = methodName;
        methodName = methodConfig.methodName;
      } else {
        methodConfig = methodConfig || {};
        methodConfig.methodName = methodName;
      }
      this.__methodConfigs[methodName] = methodConfig || {};
      this[methodName] = (...args) => this._callMethod(methodName, args);
    },

    /**
     * Called when a server method has been called on an instance of this class
     * @param {string} methodName
     * @param {any[]} methodArgs Arguments that will be passed to the server method
     * @returns {qx.Promise} A promise that will be resolved when the server responds to the method call
     */
    _callMethod(methodName, methodArgs) {
      if (this.__terminated) {
        this.error("Client API is terminated");
        return;
      }

      let promise = new qx.Promise();
      let pending = {
        promise,
        callIndex: ++this.__pendingMethodCallIndex,
        methodName,
        methodArgs
      };
      this.__pendingMethodCalls[pending.callIndex] = pending;
      let headers = {
        "Call-Index": pending.callIndex, //linebreak
        "Client-Api-Uuid": this.toUuid(),
        Cookies: JSON.stringify(this.__cookies)
      };

      if (!this.__path) {
        headers["Api-Name"] = this.__apiName;
      }

      let sessionUuid = this.__transport.getSessionUuid();
      if (sessionUuid) {
        headers["Session-Uuid"] = sessionUuid;
      }

      Promise.resolve()
        .then(() =>
          this.__transport.postMessage(this.__getUrl(methodName), {
            type: "callMethod",
            headers,
            path: this.__getPath(methodName),
            body: {
              methodArgs
            }
          })
        )
        .catch(e => {
          this.error("Error posting message", e);
          delete this.__pendingMethodCalls[pending.callIndex];
          if (pending.promise !== null) {
            promise.reject(e);
          }
        });

      return promise;
    },

    /**
     * Called when a message is received from the server by the transport
     * @param {qx.event.type.Data<zx.io.api.IResponseJson>} message
     */
    __onMessage(evt) {
      let message = evt.getData();
      for (let data of message.data) {
        this.__processData(data);
      }
    },

    /**
     * Process an item of a message data, depending on its type
     * @param {zx.io.api.IResponseJson.IResponseData} data
     */
    __processData(data) {
      //Ignore messages that are not for this API
      if (data.headers["Client-Api-Uuid"] != this.toUuid()) {
        return;
      }

      //Cookies
      let newCookies = data.headers["Cookies"];
      if (newCookies) {
        for (let cookie of newCookies) {
          if (cookie.delete === true) {
            delete this.__cookies[cookie];
          } else {
            this.__cookies[cookie] = cookie;
          }
        }
      }

      if (this.__transport.getSessionUuid() && data.headers["Session-Uuid"] && data.headers["Session-Uuid"] != this.__transport.getSessionUuid()) {
        console.warn(
          "Session UUID has changed. This means that current subscriptions will not work. Please check that you send no other request during you initial subscription, and that your connection to the server is stable."
        );
        debugger;
      }

      if (data.type == "methodReturn") {
        //Find the pending method call promise and either resolve or reject it
        let callIndex = data.headers["Call-Index"];
        if (!callIndex) {
          throw new Error("No CallIndex in return message");
        }
        let pending = this.__pendingMethodCalls[callIndex];
        if (pending) {
          delete this.__pendingMethodCalls[callIndex];
          if (data.body.error) {
            pending.promise.reject(new Error(data.body.error));
          } else {
            pending.promise.resolve(data.body.methodResult);
          }
        }
      } else if (data.type == "subscribed") {
        this.__transport.subscribe(data.headers["Session-Uuid"]);
        this.__subscriptions[data.body.eventName].promise.resolve();
        delete this.__subscriptions[data.body.eventName].promise;
      } else if (data.type == "unsubscribed") {
        this.__subscriptions[data.body.eventName].promise.resolve();
        delete this.__subscriptions[data.body.eventName];
      } else if (data.type == "publish") {
        if (!this.__subscriptions[data.body.eventName]) {
          return;
        }
        this.__subscriptions[data.body.eventName].callbacks.forEach(cb => cb(data.body.eventData));
      } else if (data.type == "shutdown") {
        this.warn("TODO shutdown not implemented");
      } else {
        throw new Error("Unexpected message type: " + data.type);
      }
    },

    /**
     * Returns a URL for a method call,
     * consisting of the API URI and the method name
     *
     * For example;
     * if this.__path is "http://example.com/api" and methodName is "doSomething" then this method will return
     * "http://example.com/api/doSomething"
     *
     * @param {string} methodName
     * @returns
     */
    __getUrl(methodName) {
      return zx.utils.Uri.join(this.__path ?? "/", methodName);
    },

    __clearSubscriptions() {
      this.__subscriptions = {};
      //todo resolve all pending promises with error
    },

    /**
     * Returns the path of the API, optionally with a method name appended
     * @param {string?} methodName
     * @returns {string?}
     */
    __getPath(methodName) {
      let apiPath = this.__path ?? "/";

      if (methodName) {
        apiPath = zx.utils.Uri.join(apiPath, methodName);
      }

      if (apiPath === "/") {
        apiPath = "";
      }

      return apiPath;
    }
  }
});
