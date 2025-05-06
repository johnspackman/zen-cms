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
 * Remote API server transport for puppeteer
 * Refer to this class in the page that runs in the remote Puppeteer browser
 */
qx.Class.define("zx.io.api.transport.iframe.IframeServerTransport", {
  type: "singleton",
  extend: zx.io.api.server.AbstractServerTransport,

  construct() {
    super();
    if (window.parent === window) {
      this.error("IframeServerTransport must be run in an iframe");
    } else {
      window.addEventListener("message", evt => this._onMessage(evt));
    }
  },

  members: {
    __ready: false,

    sendReady() {
      if (window.parent === window) {
        return;
      }
      if (this.__ready) {
        return;
      }
      window.parent.postMessage(
        zx.utils.Json.stringifyJson({
          messageType: "ready",
          messageIdentifier: zx.io.api.transport.iframe.IframeUtils.MSG_IDENTIFIER
        }),
        "*"
      );
    },

    /**
     * Called when we receive a message posted back to us
     *
     * @param {*} evt
     * @returns
     */
    async _onMessage(evt) {
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

      // Security
      /*
      if (evt.origin !== "null" && evt.origin !== document.location.origin)
        throw new Error("Access denied because wrong origin, found " + evt.origin + ", expected " + document.location.origin);
      */

      let request = new zx.io.api.server.Request(this, json.messagePayload);
      let response = new zx.io.api.server.Response();
      let connectionManager = zx.io.api.server.ConnectionManager.getInstance();
      await connectionManager.receiveMessage(request, response);
      this.postMessage(response.toNativeObject());
    },

    /**
     * @override
     */
    supportsServerPush() {
      return true;
    },

    /**
     *
     * @param {zx.io.api.IRequestJson} data
     */
    postMessage(data) {
      if (window.parent === window) {
        return;
      }
      window.parent.postMessage(
        zx.utils.Json.stringifyJson({
          messagePayload: data,
          messageType: "payload",
          messageIdentifier: zx.io.api.transport.iframe.IframeUtils.MSG_IDENTIFIER
        }),
        "*"
      );
    },

    /**@override */
    createPushResponse() {
      return new zx.io.api.server.Response();
    },

    /**@override */
    sendPushResponse(response) {
      this.postMessage(response.toNativeObject());
    },

    /**
     * @returns {boolean} Whether the puppeteer server remote API transport has been initialized and is ready to receive messages
     */
    isReady() {
      return this.__ready;
    },

    /**
     * You should setup your remote APIs and call this method shortly after the remote page loads (i.e. not after some complex intialization)
     * in order to notify the Puppeteer client that this page is ready to receive remote API calls.
     */
    makeReady() {
      this.__ready = true;
    }
  }
});
