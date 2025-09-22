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
 * Transport used to communicate with a Puppeteer browser
 * This class should be instantiated in the code which manages the browser via Puppeteer,
 * which is usually a NodeJS server.
 * The webpage inside the browser needs to use zx.thin.puppeteer.PuppeteerServerTransport
 */
qx.Class.define("zx.server.puppeteer.PuppeteerClientTransport", {
  extend: zx.io.api.client.AbstractClientTransport,

  /**
   * @param {import("puppeteer-core").Page} page The puppeteer page to use for communication
   */
  construct(page) {
    super();
    this.__page = page;
    // Catch console log messages so that we can read the protocol
    page.on("console", msg => this.__onConsole(msg));
  },

  members: {
    __page: null,
    /**
     * Called when a console message is received; this can contain encoded messages that
     * describe method calls and events
     *
     * @param {*} msg
     */
    __onConsole(msg) {
      const PREFIX = zx.thin.puppeteer.PuppeteerUtil.MSG_PREFIX;
      const SUFFIX = zx.thin.puppeteer.PuppeteerUtil.MSG_SUFFIX;

      let str = msg.text();
      if (str.startsWith(PREFIX)) {
        if (!str.endsWith(SUFFIX)) {
          this.error("Cannot interpret console message: " + str);
          return;
        }
        str = str.substring(PREFIX.length, str.length - SUFFIX.length);
        var json;
        try {
          json = zx.utils.Json.parseJson(str);
        } catch (ex) {
          this.error("Cannot parse console message payload: " + ex + ", string=" + str);

          return;
        }
        this.fireDataEvent("message", json);
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
      const MSG_PREFIX = zx.thin.puppeteer.PuppeteerUtil.MSG_PREFIX;
      const MSG_SUFFIX = zx.thin.puppeteer.PuppeteerUtil.MSG_SUFFIX;
      let strMsg = zx.utils.Json.stringifyJson(msg);
      strMsg = MSG_PREFIX + strMsg + MSG_SUFFIX;

      /*
       * @preserve
       * javascript-obfuscator:disable
       */
      await this.__page.evaluate(strMsg => {
        window.postMessage(strMsg, "*");
      }, strMsg);

      /*
       * @preserve
       * javascript-obfuscator:enable
       */
    },

    shutdown() {
      //this.postMessage(null, [{ type: "shutdown" }]);
    }
  }
});
