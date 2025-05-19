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



qx.Class.define("zx.io.api.transport.bluetooth.L2CapBluetoothServerTransport", {
  extend: zx.io.api.server.AbstractServerTransport,

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
     * @param {zx.io.api.transport.bluetooth.IL2CapSocket} socket
     */
    setSocket(socket) {
      if (this.__socket) {
        throw new Error("Socket already set");
      }
      this.__socket = socket;
      socket.addListener("receivedData", this.__onData, this);
    },

    /**@override */
    supportsServerPush() {
      return true;
    },

    /**
     * @override
     */
    sendPushResponse(response) {
      let responseStr = zx.utils.Json.stringifyJson(response.toNativeObject());

      if (this.getEncryptionMgr()) {
        responseStr = this.getEncryptionMgr().encryptData(responseStr);
      }

      this.__socket.sendData(responseStr);
    },

    /**
     * Called when we receive data in the Bluetooth connection
     * @param {qx.event.type.Data<string>} evt
     */
    async __onData(evt) {
      let msg = evt.getData();

      if (this.getEncryptionMgr()) {
        msg = this.getEncryptionMgr().decryptData(msg);
      }

      let data = zx.utils.Json.parseJson(msg);
      let request = new zx.io.api.server.Request(this, data);
      let response = new zx.io.api.server.Response(request);
      let cm = zx.io.api.server.ConnectionManager.getInstance();
      await cm.receiveMessage(request, response);
      let responseStr = zx.utils.Json.stringifyJson(response.toNativeObject());

      if (this.getEncryptionMgr()) {
        responseStr = this.getEncryptionMgr().encryptData(responseStr);
      }

      this.__socket.sendData(responseStr);
    }
  }
});
