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
 * Basic implementation of the IClientTransport interface.
 */
qx.Class.define("zx.io.api.client.AbstractClientTransport", {
  type: "abstract",
  extend: qx.core.Object,

  /**
   *
   * @param {string?} serverUri URI identifiying the server. Should include the hostname and the route to ZX remote API calls.
   * For example, if the server is running at http://localhost:3000 and its route for its HTTP server transport is /zx-api,
   * then the serverUri should be http://localhost:3000/zx-api
   */
  construct(serverUri) {
    super();

    this.__serverUri = serverUri;

    this.__pollTimer = new zx.utils.Timeout(null, this.__poll, this).set({
      recurring: true,
      duration: this.getPollInterval(),
      enabled: this.getPolling()
    });
  },

  destruct() {
    this.__pollTimer.dispose();
    this.__pollTimer = null;
  },

  events: {
    /**
     * @type {zx.io.api.IRequestJson}
     * This event needs to be fired when a message is received from the server.
     */
    message: "qx.event.type.Data"
  },

  properties: {
    /**
     * Whether we should poll always i.e. even when there are no subscriptions,
     * just to test the connection.
     */
    pollAlways: {
      init: false,
      check: "Boolean",
      event: "changePollAlways"
    },

    /**
     * If enabled, this transport will poll to the server
     * every set interval (property: pollInterval)
     */
    polling: {
      init: false,
      check: "Boolean",
      event: "changePolling",
      apply: "_applyPolling"
    },

    /**
     * How often to poll the server for messages
     */
    pollInterval: {
      init: 1000,
      event: "changePollInterval",
      check: "Integer",
      apply: "_applyPollInterval"
    },

    /**
     * If specified, this encryption manager will be used to encrypt messages
     * before they are sent to the server,
     * and to decrypt messages received from the server.
     *
     * Ideally, you should use this object in your implementation of postMessage
     * and in your received message event handler.
     */
    encryptionMgr: {
      init: null,
      nullable: true,
      check: "zx.io.api.crypto.IEncryptionMgr"
    }
  },

  members: {
    /** @type{Integer} number of consecutive times that we get an exception sending to the server */
    __numberConsecutiveFailures: 0,

    getServerUri() {
      return this.__serverUri;
    },

    /**
     * Timer used to poll all subscribed hostnames
     * every given interval
     *
     * @type {zx.utils.Timeout}
     */
    __pollTimer: null,

    /**
     * Number of subscriptions to the server
     */
    __subscriptions: 0,

    /**@type {string | null}*/
    __sessionUuid: null,

    /**
     * Called EXCLUSIVELY in zx.io.api.client.AbstractClientApi when the API has subscribed to an event
     * @param {string} sessionUuid
     */
    subscribe(sessionUuid) {
      this.__sessionUuid = sessionUuid;
      this.__subscriptions++;
    },

    /**
     * Called EXCLUSIVELY in zx.io.api.client.AbstractClientApi when the API has unsubscribed from an event
     * @param {string} apiPath
     */
    unsubscribe() {
      this.__subscriptions--;
      if (this.__subscriptions == 0) {
        this.__sessionUuid = null;
      }

      if (qx.core.Environment.get("qx.debug")) {
        if (this.__subscriptions == -1) {
          console.warn("You have unsubscribed more times than you have subscribed. There is a bug in your code.");
          debugger;
        }
      }
    },

    /**
     * Gets a session UUID for a particular hostname of a client API URI
     * @param {string?} hostname
     */
    getSessionUuid() {
      return this.__sessionUuid;
    },

    /**
     * Posts a message to the server.
     * @abstract
     * @param {string} path The path the the request. Consists of the API's path (if it has one), and the method name (if it's for a method call)
     * @param {zx.io.api.IRequestJson} requestJson
     * @returns {*}
     */
    postMessage(path, requestJson) {
      throw new Error(`Abstract method 'postMessage' of class ${this.classname} not implemented`);
    },

    /**
     * Polls the hostname for this transport,
     * if we have subscriptions.
     *
     * @returns {Promise<void>}
     */
    async __poll() {
      if (this.__numberConsecutiveFailures > zx.io.api.client.AbstractClientTransport.MAX_CONSECUTIVE_POLLING_FAILURES) {
        this.error("Too many consecutive failures, stopping polling");
        this.setPolling(false);
        debugger;
        return;
      }

      if (!this.getPollAlways() && this.__subscriptions === 0) {
        return;
      }
      let requestJson = { headers: { "Session-Uuid": this.__sessionUuid }, type: "poll", body: {} };
      try {
        await this.postMessage(this.__serverUri, requestJson);
        this.__numberConsecutiveFailures = 0;
      } catch (e) {
        this.__numberConsecutiveFailures++;
      }
    },

    /**
     * Apply function for the polling property
     */
    _applyPolling(value) {
      this.__pollTimer.setEnabled(value);
    },

    /**
     * Apply function for the pollInterval property
     */
    _applyPollInterval(value) {
      this.__pollTimer.setDuration(value);
    }
  },

  statics: {
    MAX_CONSECUTIVE_POLLING_FAILURES: 10
  }
});
