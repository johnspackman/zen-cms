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

qx.Class.define("zx.server.auth.Security", {
  extend: zx.server.Object,
  implement: [zx.io.remote.IProxied, zx.io.persistence.IObjectNotifications],
  "@": [zx.io.remote.anno.Class.NOPROXY],

  construct() {
    super();
    this.set({
      permissions: new zx.data.IndexedArray().set({
        keyGenerator: perm => perm.getShortCode()
      }),

      roles: new zx.data.IndexedArray().set({
        keyGenerator: role => role.getShortCode()
      })
    });
  },

  properties: {
    /** List of permissions defined in the system */
    permissions: {
      init: null,
      nullable: true,
      check: "zx.data.IndexedArray",
      event: "changePermissions",
      transform: "_transformPermissions",
      "@": [zx.io.persistence.anno.Property.DEFAULT, zx.io.remote.anno.Property.DEFAULT]
    },

    /** List of roles defined in the system */
    roles: {
      init: null,
      nullable: true,
      check: "zx.data.IndexedArray",
      event: "changeRoles",
      transform: "_transformRoles",
      "@": [zx.io.persistence.anno.Property.DEFAULT, zx.io.remote.anno.Property.DEFAULT]
    }
  },

  members: {
    /**
     * @Override
     */
    async receiveDataNotification(key, data) {
      if (key == zx.io.persistence.IObjectNotifications.DATA_LOAD_COMPLETE) {
        const DEFAULT_PERMISSIONS = zx.server.auth.Security.__DEFAULT_PERMISSIONS;
        let perms = this.getPermissions();
        let modified = false;
        for (let shortCode in DEFAULT_PERMISSIONS) {
          if (!perms.lookup(shortCode)) {
            let perm = await zx.server.Standalone.getInstance().findOneObjectByType(zx.server.auth.Permission, { shortCode: shortCode });

            if (!perm) {
              perm = new zx.server.auth.Permission().set({
                shortCode: shortCode,
                title: DEFAULT_PERMISSIONS[shortCode].title,
                notes: DEFAULT_PERMISSIONS[shortCode].notes
              });
            }

            perms.push(perm);
            await perm.save();
            modified = true;
          }
        }
        if (modified) {
          this.save();
        }
      }
    },

    /**
     * Transform for `permissions`
     */
    _transformPermissions(value, oldValue) {
      if (!oldValue) {
        return value;
      }
      oldValue.replace(value || []);
      return oldValue;
    },

    /**
     * Transform for `roles`
     */
    _transformRoles(value, oldValue) {
      if (!oldValue) {
        return value;
      }
      oldValue.replace(value || []);
      return oldValue;
    },

    /**
     * Finds a permission by the short code
     *
     * @param {String} shortCode
     * @returns {zx.server.auth.Permission?} null if not found
     */
    findPermission(shortCode) {
      return this.getPermissions().find(perm => perm.getShortCode() == shortCode) || null;
    },

    /**
     * Finds a role by the short code
     *
     * @param {String} shortCode
     * @returns {zx.server.auth.Role?} null if not found
     */
    findRole(shortCode) {
      return this.getRoles().find(role => role.getShortCode() == shortCode) || null;
    }
  },

  statics: {
    __DEFAULT_PERMISSIONS: {
      "zx-logged-in-user": {
        title: "ZX:: User is logged in",
        notes: "System permission which is automatically assigned while a user is logged in (do not explicitly assign this to a user)"
      },

      "zx-super-user": {
        title: "ZX:: Super user",
        notes: "This permission grants complete authority and is assumed to have all permissions"
      }
    },

    /**
     * Finds a permission (if a permission is passed instead of a string, then the permission is returned)
     *
     * @param {String|zx.server.auth.Permission} shortCode
     * @returns {zx.server.auth.Permission}
     */
    async findPermission(shortCode) {
      if (shortCode instanceof zx.server.auth.Permission) {
        return shortCode;
      }
      let server = zx.server.Standalone.getInstance();
      let security = await server.findOneObjectByType(zx.server.auth.Security, null, true);

      let perm = security.getPermissions().lookup(shortCode);
      return perm;
    }
  }
});
