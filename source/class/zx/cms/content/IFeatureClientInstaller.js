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

/**
 * Classes which render on the client must implement this if they are to be
 * used with `zx.cms.content.SimpleFeature` (otherwise they must provide their
 * own implementation of `zx.cms.content.IFeature`)
 */
qx.Interface.define("zx.cms.content.IFeatureClientInstaller", {
  members: {
    /**
     * Called on the client to initialise the feature
     *
     * @param piece {Object} the configuration of the piece
     * @param options {Map}
     */
    async clientInstall(piece, options) {}
  }
});
