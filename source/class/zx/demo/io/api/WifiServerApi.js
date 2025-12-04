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
 *    Patryk Malinowski (@patryk-m-malinowski)
 *
 * ************************************************************************ */

qx.Class.define("zx.demo.io.api.WifiServerApi", {
  extend: zx.io.api.server.AbstractServerApi,
  construct() {
    super("zx.demo.io.api.WifiApi");

    this.__interval = setInterval(() => {
      this.publish("changeOnlineStatus", this.__onlineStatus++);
    }, 1000);
  },

  members: {
    /**@override */
    _publications: {
      changeOnlineStatus: {}
    },

    __onlineStatus: 0,
    isOnline() {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve(this.__onlineStatus);
        }, 1);
      });
    }
  }
});
