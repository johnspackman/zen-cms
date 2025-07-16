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
 * Provides a Chromium instance running in a Docker container, where it obtains the Chromium
 * details from the Worker.
 *
 * Don't instantiate this directly, use `zx.server.work.Worker.getChromium()` instead.
 */
qx.Class.define("zx.server.work.WorkerChromium", {
  extend: qx.core.Object,
  implement: [zx.server.puppeteer.IChromium],

  construct(chromiumUrl) {
    super();
    this.__chromiumUrl = chromiumUrl;
  },

  statics: {
    TIME_BETWEEN_PASSES_MS: 3000,
    MAX_TIME_TO_WAIT_FOR_CHROMIUM: 30000
  },

  members: {
    /** @type {String} the HTTP url for the Chromium */
    __chromiumUrl: null,

    /** @type {String} the websocket endpoint (loaded from the `__chromiumUrl`) */
    __endpoint: null,

    /** @type {*} the JSON returned from teh chromium url /json/version */
    __chromiumJson: null,

    /**
     * Initialises the Chromium instance
     */
    async initialise() {
      if (this.__chromiumJson) {
        return;
      }

      let pass = 0;
      const WorkerChromium = zx.server.work.WorkerChromium;
      let maxPasses = WorkerChromium.MAX_TIME_TO_WAIT_FOR_CHROMIUM / WorkerChromium.TIME_BETWEEN_PASSES_MS;
      while (true) {
        pass++;
        try {
          let get = await zx.utils.Http.httpGet(`${this.__chromiumUrl}/json/version`);
          let json = get.body;
          if (json) {
            this.__chromiumJson = json;
            this.__endpoint = json.webSocketDebuggerUrl;
            this.debug("Chromium JSON: " + JSON.stringify(json, null, 2));

            try {
              get = await zx.utils.Http.httpGet(`${this.__chromiumUrl}/puppeteer-version`);
            } catch (ex) {
              // Exception means that it is not a puppeteer proxied server, so we can ignore it because
              // our puppeteer version is connectingn directly to chromium
              get = null;
            }
            if (get) {
              let remoteVersion = get.body?.version?.match(/^([^.]+)\.([^.]+)\.([^.]+)$/);
              const PUPPETEER_VERSION = require("puppeteer-core/package.json")["version"];
              let localVersion = PUPPETEER_VERSION.match(/^([^.]+)\.([^.]+)\.([^.]+)$/);
              if (remoteVersion && localVersion) {
                if (remoteVersion[1] !== localVersion[1]) {
                  throw new Error(`Incompatible Puppeteer versions. Local server uses ${localVersion}, remote container uses ${remoteVersion}`);
                }
                if (remoteVersion[2] !== localVersion[2]) {
                  this.warn(`WARNING: Puppeteer minor versions differ. Local server uses ${localVersion}, remote container uses ${remoteVersion}`);
                }
                if (remoteVersion[3] !== localVersion[3]) {
                  this.info(`Puppeteer patch versions differ - did you forget to update? Local server uses ${localVersion}, remote container uses ${remoteVersion}`);
                }
              }
            }
            break;
          }
        } catch (ex) {
          this.warn(`Chromium not yet available on '${this.__chromiumUrl}/json/version', waiting 3 seconds: ${ex}`);
        }
        if (pass > maxPasses) {
          throw new Error("Chromium not available after " + pass + " attempts");
        }
        await zx.utils.Promisify.waitFor(WorkerChromium.TIME_BETWEEN_PASSES_MS);
      }

      this.info("Chromium started: " + JSON.stringify(this.__chromiumJson, null, 2));
    },

    /**
     * @Override
     */
    getBaseUrl() {
      return this.__chromiumUrl;
    },

    /**
     * @returns {*} the JSON returned from Chromium's `/json/version` URL
     */
    getJsonVersion() {
      return this.__chromiumJson;
    },

    /**
     * @Override
     */
    getEndpoint() {
      return this.__endpoint;
    },

    /**
     * @Override
     */
    release() {
      // Nothing
    }
  }
});
