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
 * This interface represents an object which sends and receives data over a Bluetooth L2CAP connection
 */
qx.Interface.define("zx.io.api.transport.bluetooth.IL2CapSocket", {
  events: {
    /**
     * @type {*}
     * When data is received from the socket
     */
    receivedData: "qx.event.type.Data"
  },
  members: {
    /**
     * @param {*} data Sends data to the socket
     */
    sendData(data) {}
  }
});
