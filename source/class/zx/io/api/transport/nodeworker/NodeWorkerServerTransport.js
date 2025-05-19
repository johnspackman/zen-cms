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



const { isMainThread, parentPort, Worker, MessagePort } = require("node:worker_threads");

/**
 * Server transport for a node worker thread connection
 *
 * A node worker transport communicates between a node worker thread and the owner process which spawned it.
 */
qx.Class.define("zx.io.api.transport.nodeworker.NodeWorkerServerTransport", {
  extend: zx.io.api.server.AbstractServerTransport,

  construct() {
    super();
    this.__clientsByApiUuid = new Map();

    if (isMainThread) {
      throw new Error("zx.io.api.transport.nodeworker.NodeWorkerServerTransport must be created in a Worker thread");
    }
    this.connect(parentPort);
  },

  members: {
    /**@type {Map<string, Worker | MessagePort>}*/
    __clientsByApiUuid: null,

    /**
     * Connects a client to the server
     * @param {Worker | MessagePort} client
     */
    connect(client) {
      if (!(client instanceof Worker) && !(client instanceof MessagePort)) {
        throw new Error(["Client must be a node Worker or MessagePort", '\tconst { Worker, MessagePort } = require("node:worker_threads")'].join("\n"));
      }
      client.postMessage({ uri: null, ready: true });
      client.on("message", ({ uri, requestJson }) => {
        this.__clientsByApiUuid.set(requestJson.headers["Client-Api-Uuid"], client);
        this.__receiveMessage(uri, requestJson);
      });
    },

    /**
     * Sends a message back to the client.
     * Only works if this transport support server-side push
     * @param {zx.io.api.IResponseJson} responseJson
     */
    __postMessage(responseJson) {
      this.__clientsByApiUuid.get(responseJson.data[0].headers["Client-Api-Uuid"])?.postMessage(responseJson);
    },

    /**
     * @param {string} uri
     * @param {zx.io.api.IRequestJson} requestJson
     */
    async __receiveMessage(uri, requestJson) {
      let request = new zx.io.api.server.Request(this, requestJson);
      if (uri) {
        let breakout = zx.utils.Uri.breakoutUri(uri);
        request.setPath(breakout.path);
      }
      let response = new zx.io.api.server.Response(request);
      await zx.io.api.server.ConnectionManager.getInstance().receiveMessage(request, response);
      let json = response.toNativeObject();
      this.__postMessage(json);
    },

    /**
     * @override
     */
    supportsServerPush() {
      return true;
    },

    /**
     * @override
     */
    sendPushResponse(response) {
      let json = response.toNativeObject();
      this.__postMessage(json);
    }
  },

  destruct() {
    delete this.__clientsByApiUuid;
  }
});
