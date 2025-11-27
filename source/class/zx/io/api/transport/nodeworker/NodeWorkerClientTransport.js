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
 *    Patryk Malinowski (@patryk-m-malinowski)
 *    John Spackman (john.spackman@zenesis.com, @johnspackman)
 *
 * ************************************************************************ */

const { Worker, MessagePort } = require("node:worker_threads");

/**
 * Client transport for a node worker thread connection
 *
 * A node worker transport communicates between a node worker thread and the owner process which spawned it.
 */
qx.Class.define("zx.io.api.transport.nodeworker.NodeWorkerClientTransport", {
  extend: zx.io.api.client.AbstractClientTransport,

  construct() {
    super();
    this.__promiseReady = new qx.Promise();
  },

  events: {
    message: "qx.event.type.Data"
  },

  members: {
    /** @type {Worker | MessagePort}*/
    __server: null,

    /** @type{Promise} resolves when the server transport has connected */
    __promiseReady: null,

    /**
     * Connects to a server
     * @param {Worker | MessagePort} server
     */
    async connect(server) {
      if (this.__server) {
        throw new Error("Already connected to server");
      }
      this.__server = server;
      this.__server.on("message", message => this.__onMessage(message));
      await this.__promiseReady;
    },

    /**
     * Event handler for incoming messages from the server
     *
     * @param {*} message
     */
    __onMessage(message) {
      if (message.ready) {
        this.__promiseReady.resolve();
        return;
      }
      this.fireDataEvent("message", message);
    },

    /**
     * Waits until the server has started up and connected
     *
     * @returns {Promise} resolves when the server is ready
     */
    async waitForReady() {
      return await this.__promiseReady;
    },

    /**
     * Posts a message to the server.
     * @param {string} uri The URI to post the message to
     * @param {zx.io.api.IRequestJson} message
     */
    postMessage(uri, requestJson) {
      if (!this.__server) {
        throw new Error("Not connected to server");
      }
      this.__server.postMessage({ uri, requestJson });
    }
  },

  destruct() {
    delete this.__server;
  }
});
