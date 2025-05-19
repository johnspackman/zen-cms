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
qx.Class.define("zx.thin.puppeteer.PuppeteerServerTransport", {
  type: "singleton",
  extend: zx.io.api.server.AbstractServerTransport,

  construct() {
    super();
    window.addEventListener("message", this._onMessage.bind(this), false);
  },
  members: {
    __ready: false,

    /**
     * Called when we receive a message posted back to us
     *
     * @param {*} evt
     * @returns
     */
    async _onMessage(evt) {
      const PREFIX = zx.thin.puppeteer.PuppeteerUtil.MSG_PREFIX;
      const SUFFIX = zx.thin.puppeteer.PuppeteerUtil.MSG_SUFFIX;
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

      if (typeof msg !== "string") {
        return;
      }
      if (!msg.startsWith(PREFIX)) return;

      msg = msg.substring(PREFIX.length, msg.length - SUFFIX.length);

      var json;
      try {
        json = zx.utils.Json.parseJson(msg);
      } catch (ex) {
        apiError("Cannot parse message " + msg);
        return;
      }

      let request = new zx.io.api.server.Request(this, json);
      let response = new zx.io.api.server.Response(request);
      let connectionManager = zx.io.api.server.ConnectionManager.getInstance();
      await connectionManager.receiveMessage(request, response);
      this.postMessage(response.toNativeObject());
    },

    /**@override */
    supportsServerPush() {
      return true;
    },

    /**
     *
     * @param {zx.io.api.IRequestJson} data
     */
    postMessage(data) {
      console.log(zx.thin.puppeteer.PuppeteerUtil.MSG_PREFIX + zx.utils.Json.stringifyJson(data) + zx.thin.puppeteer.PuppeteerUtil.MSG_SUFFIX);
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
