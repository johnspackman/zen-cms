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

/**
 * Interface for server transports,
 * which send and receive data from the client
 */
qx.Class.define("zx.io.api.server.AbstractServerTransport", {
  type: "abstract",
  extend: qx.core.Object,

  properties: {
    encryptionMgr: {
      init: null,
      nullable: true,
      check: "zx.io.api.crypto.IEncryptionMgr"
    }
  },

  members: {
    /**
     * Derived classes implementing server push should override this method
     * @returns {boolean} whether this transport supports server-side push
     */
    supportsServerPush() {
      return false;
    },

    /**
     * Creates a response object for a server push message.
     * Only works if this transport supports server-side push
     * @param {zx.io.api.server.Session} session The session to create the response for.
     *   Can be used to determine the client to send the response to.
     * @returns {zx.io.api.server.Response}
     */
    createPushResponse(session) {
      return new zx.io.api.server.Response();
    },

    /**
     * Sends the server push response created with method `createPushResponse`
     * @param {zx.io.api.server.Response} response
     */
    sendPushResponse(response) {
      if (!this.supportsServerPush()) {
        throw new Error(`${this.classname} does not support server push`);
      }
    }
  }
});
