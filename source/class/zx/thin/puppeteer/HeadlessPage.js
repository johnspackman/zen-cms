/**
 * This class is instantiated on the client side and is responsible for interacting with the
 * instance of zx.server.puppeteer.PuppeteerClient, including calling API methods and sending
 * events which are exposed via zx.server.puppeteer.AbstractServerApi
 */
qx.Class.define("zx.thin.puppeteer.HeadlessPage", {
  extend: qx.core.Object,

  /**
   * Constructor
   */
  construct() {
    super();
    this.__pendingCalls = {};
    this.__browserApis = {};
    window.addEventListener("message", this._onMessage.bind(this), false);
  },

  events: {
    message: "qx.event.type.Data",
    ready: "qx.event.type.Event"
  },

  members: {
    /** @type{Boolean} whether the other side is ready */
    __parentReady: false,

    /** @type{Array} events to post back to the other side */
    __queuedEvents: null,

    /** @type{Object<Integer,Promise>} calls which are sent to the other side and the promises that will resolve when they return */
    __pendingCalls: null,

    /** @type{Integer} unique serial number for each call, so that the other side can tell us which pending call is being returned from */
    __pendingCallsSerialNo: 0,

    /** @type{Object<String,zx.thin.puppeteer.api.AbstractBrowserApi} list of browser APIs, indexed by namespace (typically the classname) */
    __browserApis: null,

    /**
     * Adds an API
     *
     * @param {zx.thin.puppeteer.api.AbstractBrowserApi} api the API instance to add
     */
    addBrowserApi(api) {
      this.__browserApis[api.getServerApiName()] = api;
    },

    /**
     * Detects whether the headless chrome is connected and ready to communicate (and
     * also whether the "ready" event has been `emit`-d from this
     *
     * @return {Boolean} true if ready
     */
    isReady() {
      return this.__parentReady;
    },

    /**
     * Posts a shutdown message to the node controller
     */
    postShutdown() {
      this.postMessage("shutdown");
    },

    /**
     * Tells the other side that we are ready
     */
    postReady() {
      // Send "loaded" event immediately; this will alert the outer iframe that any previously
      //  sent messages (such as parent-ready) will not have been received
      this._postResponse({
        type: "event",
        event: {
          type: "loaded",
          data: null
        }
      });

      // Send the "ready" event (which will only be dispatched once the parent is ready for it)
      this.postMessage("ready");
    },

    /**
     * Posts an event back to the parent iframe
     */
    postMessage(type, data) {
      if (!this.__parentReady) {
        if (!this.__queuedEvents) {
          this.__queuedEvents = [];
        }
        this.__queuedEvents.push({
          type: type,
          data: data
        });

        return;
      }
      //console.log("Posting message: type=" + type);
      this._postResponse({
        type: "event",
        event: {
          type: type,
          data: data
        }
      });
    },

    /**
     * Sends the message to the other side
     *
     * @param {*} data
     */
    _postResponse(data) {
      data.signature = "zx.thin.puppeteer.HeadlessPage";

      // If the event source is this window, then we're being controlled from DevTools and the
      //  postMessage call is injected.  Our way back to DevTools is by embedding in console
      //  output and not via postMesssage (because that will cause an infinite loop)
      if (window === window.parent) {
        ///if (this.__lastSource === window) {
        console.log(zx.thin.puppeteer.HeadlessPage.PREFIX + JSON.stringify(data) + zx.thin.puppeteer.HeadlessPage.SUFFIX);
      } else {
        if (this.__lastSource && this.__lastSource !== window.parent) {
          throw new Error("Multiple sources for messages!");
        }
        window.parent.postMessage(JSON.stringify(data), "*");
      }
    },

    /**
     * Implementation of API calls to the other side
     *
     * @param {String} namespace
     * @param {String} methodName
     * @param {Object[]} args
     * @returns {*}
     */
    apiCall(namespace, methodName, args) {
      let id = "apicall-" + ++this.__pendingCallsSerialNo;
      let data = (this.__pendingCalls[id] = {
        id: id,
        namespace: namespace,
        methodName: methodName,
        args: args
      });

      let p = new Promise((resolve, reject) => {
        data.promise = this;
        data.resolve = resolve;
        data.reject = reject;
      });
      this.postMessage("api-call", {
        id: id,
        namespace: namespace,
        methodName: methodName,
        args: args
      });

      return p;
    },

    /**
     * Sends an event to the other side
     * @param {String} namespace
     * @param {String} eventName
     * @param {*} msgData
     */
    apiSendEvent(namespace, eventName, msgData) {
      this.postMessage("api-event", {
        namespace: namespace,
        name: eventName,
        data: msgData
      });
    },

    /**
     * Called when we receive a message posted back to us
     *
     * @param {*} evt
     * @returns
     */
    async _onMessage(evt) {
      var t = this;

      // Security
      /*
      if (evt.origin !== "null" && evt.origin !== document.location.origin)
        throw new Error("Access denied because wrong origin, found " + evt.origin + ", expected " + document.location.origin);
      */
      this.__lastSource = evt.source;

      function apiError(err) {
        t.error(err);
        t._postResponse({
          type: "api-error",
          error: err
        });
      }

      // Get data
      var msg = evt.data;

      //console.log("Received message: " + msg);
      this.fireDataEvent("message", msg);
      var json;
      try {
        json = JSON.parse(msg);
      } catch (ex) {
        apiError("Cannot parse message " + msg);
        return;
      }
      if (!json) {
        apiError("No JSON in message " + msg);
        return;
      }
      if (json.signature !== "zx.thin.puppeteer.HeadlessPage") {
        return;
      }

      // Method call
      if (json.type == "call") {
        let data = json && json.data;
        if (!data) {
          apiError("No data in message " + msg);
          return;
        }
        let api = this.__browserApis[data.namespace];
        if (!api) {
          apiError("Cannot process method call for '" + data.methodName + "' because there is no such API namespace '" + data.namespace + "'");
          return;
        }

        let fn = api[data.methodName];
        if (!fn) {
          apiError("Cannot process method call for '" + data.methodName + "' because there is no such method in API '" + data.namespace + "'");
          return;
        }

        let result = fn.apply(api, data.args || []);
        qx.Promise.resolve(result).then(result => {
          this._postResponse({
            type: "return",
            serialNo: json.serialNo,
            value: result
          });
        });
        return;

        // Parent is ready
      } else if (json.type == "parent-ready") {
        this.__parentReady = true;
        if (this.__queuedEvents) {
          var queued = this.__queuedEvents;
          this.__queuedEvents = null;
          queued.forEach(function (event) {
            t._postResponse({
              type: "event",
              event: event
            });
          });
        }
        this.fireEvent("ready");

        // Returning a value from a method call
      } else if (json.type == "api-return") {
        var data = this.__pendingCalls[json.id];
        if (!data) {
          apiError("Unexpected API return: " + JSON.stringify(json));
          return;
        }
        delete this.__pendingCalls[json.id];
        if (json.exception) {
          data.reject(json.exception);
        } else data.resolve(json.result);

        // Something else
      } else if (evt.source !== window) {
        // Error
        apiError("Unexpected message type: " + JSON.stringify(json));
      }
    }
  },

  statics: {
    /** @type{String} prefix for encoding strings, must be unique in the output */
    PREFIX: "[[__ZX_PUPPETEER_START__]]",

    /** @type{String} suffix for encoding strings, must be unique in the output */
    SUFFIX: "[[__ZX_PUPPETEER_END__]]",

    /** @type{zx.thin.puppeteer.HeadlessPage} the singleton instance */
    __instance: null,

    /**
     * Returns a singleton, creating it if necessary
     *
     * @returns {zx.thin.puppeteer.HeadlessPage} the instance
     */
    getInstance() {
      if (!zx.thin.puppeteer.HeadlessPage.__instance) {
        zx.thin.puppeteer.HeadlessPage.__instance = new zx.thin.puppeteer.HeadlessPage();
      }
      return zx.thin.puppeteer.HeadlessPage.__instance;
    }
  }
});
