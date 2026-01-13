/* ************************************************************************
 *
 *  Zen [and the art of] CMS
 *
 *  https://zenesis.com
 *
 *  Copyright:
 *    2019-2022 Zenesis Ltd, https://www.zenesis.com
 *
 *  License:
 *    MIT (see LICENSE in project root)
 *
 *  Authors:
 *    John Spackman (john.spackman@zenesis.com, @johnspackman)
 *
 * ************************************************************************ */

qx.Class.define("zx.cms.render.AbstractRendering", {
  extend: qx.core.Object,
  type: "abstract",
  implement: [zx.cms.render.IRendering],

  members: {
    __stopped: false,

    /**
     * @Override
     */
    getHostName() {
      return zx.server.Standalone.getInstance().getWebsiteName();
    },

    /*
     * @Override
     */
    stop() {
      this.__stopped = true;
    },

    /*
     * @Override
     */
    isStopped() {
      return this.__stopped;
    }
  }
});
