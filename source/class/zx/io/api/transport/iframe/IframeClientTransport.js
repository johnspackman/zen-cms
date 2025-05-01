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
 * Transport used to communicate with an iframe.
 *
 * The webpage inside the browser needs to use zx.io.api.iframe.IframeServerTransport
 */
qx.Class.define("zx.io.api.transport.iframe.IframeClientTransport", {
  extend: zx.io.api.client.AbstractClientTransport,

  construct(iframe) {
    super();
    this.__iframe = iframe;
    this.__onMessageBound = this.__onMessage.bind(this);
    window.addEventListener("message", this.__onMessageBound, false);
    this.__promiseReady = new qx.Promise();
    iframe.addListener("load", () => {
      this.__loaded = true;
      this.debug("Iframe loaded");
    });
  },

  destruct() {
    if (this.__onMessageBound) {
      window.removeEventListener("message", this.__onMessageBound, false);
      this.__onMessageBound = null;
    }
  },

  members: {
    __iframe: null,
    __onMessageBound: null,
    __promiseReady: null,
    __loaded: false,

    async waitForReady() {
      await this.__promiseReady;
    },

    /**
     * Called when a console message is received; this can contain encoded messages that
     * describe method calls and events
     *
     * @param {*} msg
     */
    __onMessage(evt) {
      var msg = evt.data;
      let json = null;
      if (typeof msg == "string") {
        try {
          json = zx.utils.Json.parseJson(msg);
        } catch (ex) {
          this.error("Cannot convert message to string: " + ex);
          return;
        }
      }
      if (!json) {
        this.error("No message received");
        return;
      }
      if (json.messageIdentifier !== zx.io.api.transport.iframe.IframeUtils.MSG_IDENTIFIER) {
        this.error("Message identifier not found");
        return;
      }

      if (json.messageType == "payload") {
        if (qx.core.Environment.get("qx.debug")) {
          this.debug("Received payload: " + JSON.stringify(json.messagePayload));
        }
        this.fireDataEvent("message", json.messagePayload);
        return;
      } else if (json.messageType == "ready") {
        if (qx.core.Environment.get("qx.debug")) {
          this.debug("Remote iframe server is ready");
        }
        this.__promiseReady.resolve();
        return;
      } else {
        this.error("Unrecognised message: " + JSON.stringify(json));
        return;
      }
    },

    /**
     * @override
     */
    async postMessage(uri, msg) {
      if (msg === undefined) {
        debugger;
        throw new Error(`Invalid value to send to ${this.classname}.postMessage: ${msg}`);
      }
      let iframeWindow = this.__iframe && this.__iframe.getWindow();
      iframeWindow.postMessage(
        zx.utils.Json.stringifyJson({
          messageIdentifier: zx.io.api.transport.iframe.IframeUtils.MSG_IDENTIFIER,
          messagePayload: msg
        }),
        "*"
      );
    },

    shutdown() {
      //this.postMessage(null, [{ type: "shutdown" }]);
    }
  }
});
