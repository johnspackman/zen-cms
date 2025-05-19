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
 * Server transport for a web worker connection
 *
 * A web worker transport communicates between a web worker and the owner process which spawned it.
 *
 * @ignore(self)
 * @ignore(Worker)
 */
qx.Class.define("zx.io.api.transport.webworker.WebWorkerServerTransport", {
  extend: zx.io.api.server.AbstractServerTransport,

  construct() {
    super();
    this.__clientsByApiUuid = new Map();

    if (typeof self.postMessage !== "undefined") {
      this.connect(self);
    }
  },

  members: {
    /**@type {Map<string, Worker | typeof self>}*/
    __clientsByApiUuid: null,

    /**
     * Connects a client to the server
     * @param {Worker | typeof self} client
     */
    connect(client) {
      if (!(client instanceof Worker) && !(client !== self)) {
        throw new Error("Client must be a web Worker or web worker process 'self' context");
      }
      client.addListener("message", ({ uri, requestJson }) => {
        this.__clientsByApiUuid.set(requestJson.headers["Client-Api-Uuid"], client);
        this.receiveMessage(uri, requestJson);
      });
    },

    /**
     * Sends a message back to the client.
     * Only works if this transport support server-side push
     * @param {zx.io.api.IRequestJson} requestJson
     */
    postMessage(requestJson) {
      this.__clientsByApiUuid.get(requestJson.headers["Client-Api-Uuid"])?.postMessage(requestJson);
    },

    /**
     * @param {string} uri
     * @param {zx.io.api.IRequestJson} requestJson
     */
    async receiveMessage(uri, requestJson) {
      let request = new zx.io.api.server.Request(this, requestJson);
      if (uri) {
        let breakout = zx.utils.Uri.breakoutUri(uri);
        request.setPath(breakout.path);
      }
      let response = new zx.io.api.server.Response(request);
      await zx.io.api.server.ConnectionManager.getInstance().receiveMessage(request, response);
      for (let data of response.getData()) {
        this.postMessage(data);
      }
    },

    /**
     * Override this method to return true if the transport supports server-side push.
     * @returns {true}
     */
    supportsServerPush() {
      return true;
    }
  },

  destruct() {
    delete this.__clientsByApiUuid;
  }
});
