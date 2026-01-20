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

qx.Class.define("zx.thin.core.FeatureClientInstaller", {
  extend: qx.core.Object,
  implement: [zx.cms.content.IFeatureClientInstaller],

  members: {
    /**
     * @Override
     */
    async clientInstall(piece, domNode, options) {
      let clazz = this._getTargetClass(options);
      if (!clazz) {
        this.error(`Cannot install piece for ${options.targetClassname} because class does not exist`);

        return null;
      }

      if (qx.Class.isSubClassOf(clazz, qx.html.Node)) {
        let obj = this._createFeature(clazz, options);
        let domNode = piece.uniqueDiv.firstElementChild;
        if (domNode && this._shouldUseDom(domNode, options)) {
          obj.useNode(domNode);
        } else {
          let domParent = domNode.parentElement;
          while (domParent.firstChild) {
            domParent.removeChild(domParent.firstChild);
          }
          obj.flush();
          domParent.appendChild(obj.getDomElement());
        }
        obj.setRoot(true);
        await this._onFeatureReady(obj, options);
        return obj;
      }

      this.error("Cannot install piece for " + clazz.classname + " because I dont know how to handle it");

      return null;
    },

    _shouldUseDom(domNode, options) {
      return options.useDom;
    },

    _getTargetClass(options) {
      return qx.Class.getByName(options.targetClassname);
    },

    _createFeature(clazz, options) {
      return new clazz();
    },

    async _onFeatureReady(feature, options) {
      if (qx.Class.hasInterface(feature.constructor, zx.cms.content.IFeatureClientLifecycle)) {
        await feature.onReady(options);
      }
    }
  },

  statics: {
    /**
     * Installs a Piece
     *
     * @param piece {Object} the piece config
     * @param options {Map} map of options/config
     */
    async installPiece(piece, options) {
      const useDom = (options && options.useDom) || false;

      let clazz = options.clientInstallerClassname ? qx.Class.getByName(options.clientInstallerClassname) : zx.thin.core.FeatureClientInstaller;
      if (qx.core.Environment.get("qx.debug")) {
        qx.core.Assert.assertTrue(qx.Class.hasInterface(clazz, zx.cms.content.IFeatureClientInstaller));
      }

      let obj = new clazz();
      let domNode = piece.uniqueDiv.firstElementChild;
      return await obj.clientInstall(piece, domNode, options);
    }
  }
});
