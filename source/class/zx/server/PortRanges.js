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
 *    John Spackman (@johnspackman)
 *
 * ************************************************************************ */

qx.Class.define("zx.server.PortRanges", {
  extend: qx.core.Object,

  statics: {
    /** @type{zx.utils.Range} allocatable port range for debuggable child node processes */
    NODE_DEBUG_PORT_RANGE: new zx.utils.Range(9000, 9999),

    /** @type{zx.utils.Range} allocatable port range for Chromium poirts */
    CHROMIUM_PORT_RANGE: new zx.utils.Range(11000, 11999),

    /** @type{zx.utils.Range} allocatable port range for Node child processes' HTTP server API */
    NODE_HTTP_SERVER_API_PORT_RANGE: new zx.utils.Range(10000, 10999)
  }
});
