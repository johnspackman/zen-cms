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
 * @use(zx.cms.website.UrlRule)
 * @use(zx.cms.website.NavItem)
 */
qx.Class.define("zx.cms.website.Site", {
  extend: zx.io.persistence.Object,
  implement: [zx.io.remote.IProxied],

  construct() {
    super();
    this.setUrlRules(new qx.data.Array());
  },

  properties: {
    /** Site title */
    title: {
      nullable: false,
      check: "String",
      event: "changeTitle",
      "@": [zx.io.persistence.anno.Property.DEFAULT, zx.io.remote.anno.Property.DEFAULT]
    },

    /** Root navigation item; this instance is not expected to be on display, but its children are */
    rootNavigation: {
      init: null,
      nullable: true,
      check: "zx.cms.website.NavItem",
      event: "changeRootNavigation",
      "@": [zx.io.persistence.anno.Property.EMBED, zx.io.remote.anno.Property.DEFAULT]
    },

    /** List of URL rules to check for each request */
    urlRules: {
      check: "qx.data.Array",
      event: "changeUrlRules",
      transform: "_transformUrlRules",
      "@": [zx.io.persistence.anno.Property.EMBED, zx.io.remote.anno.Property.DEFAULT]
    }
  },

  members: {
    /**
     * Transform for `urlRules` property
     */
    _transformUrlRules(value, oldValue) {
      if (oldValue) {
        oldValue.replace(value);
        return oldValue;
      }
      return value;
    }
  }
});
