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

qx.Class.define("zx.demo.io.api.PlayerMediaClientApi", {
  extend: zx.io.api.client.AbstractClientApi,
  /**
   * @param {zx.io.api.client.AbstractClientTransport} transport The transport object that this API class sends and receives data
   * @param {string?} path The URI of the server API. If provided, calls to the server will be forwarded to the API registerd at the path of the URI
   */
  construct(transport, path) {
    super(transport, "zx.demo.io.api.PlayerMediaApi", ["getCurrentMedia", "playMedia"], path);
  }
});
