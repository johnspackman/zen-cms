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
 * Transport used for send/receiving data over a Bluetooth L2CAP server connection
 */
qx.Class.define("zx.io.api.transport.bluetooth.L2CapBluetoothClientTransport", {
  extend: zx.io.api.client.AbstractClientTransport,

  /**
   *
   * @param {zx.io.api.transport.bluetooth.IL2CapSocket?} socket
   */
  construct(socket) {
    if (socket) {
      this.setSocket(socket);
    }
  },

  members: {
    /**
     * @type {zx.io.api.transport.bluetooth.IL2CapSocket}
     */
    __socket: null,

    /**
     * @override
     */
    postMessage(uri, data) {
      let strData = zx.utils.Json.stringifyJson(data);
      if (this.getEncryptionMgr()) {
        strData = this.getEncryptionMgr().encryptData(strData);
      }
      this.__socket.sendData(strData);
    },

    __onData(evt) {
      let data = evt.getData();

      if (this.getEncryptionMgr()) {
        data = this.getEncryptionMgr().decryptData(data);
      }

      let json = zx.utils.Json.parseJson(data);
      this.fireDataEvent("message", json);
    },

    setSocket(socket) {
      if (this.__socket) {
        throw new Error("Socket already set");
      }
      this.__socket = socket;
      socket.addListener("receivedData", this.__onData, this);

      socket.addListener("disconnected", () => {
        this.reset("Bluetooth connection closed");
      });
    }
  }
});
