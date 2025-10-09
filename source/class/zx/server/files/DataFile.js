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

const fs = require("fs");
const path = require("path");

qx.Class.define("zx.server.files.DataFile", {
  extend: zx.server.Object,
  include: [zx.server.MObjectLastModified, zx.server.files.MDataFile],
  implement: [zx.io.persistence.IObjectNotifications],
  "@": [
    new zx.io.remote.anno.Class().set({
      clientMixins: "zx.server.files.MDataFile"
    }),

    zx.io.persistence.anno.Class.DEFAULT
  ],

  properties: {
    /** Description of the file */
    title: {
      init: null,
      nullable: true,
      check: "String",
      event: "changeTitle",
      "@": [zx.io.persistence.anno.Property.DEFAULT, zx.io.remote.anno.Property.DEFAULT, zx.server.anno.LastModified.DEFAULT, zx.utils.anno.Json.PUBLIC]
    },

    /** A unique ID, human readable, that can be used to reliably find a file/blob by a known URI */
    wellKnownId: {
      init: null,
      check: "String",
      event: "changeWellKnownId",
      "@": [zx.io.persistence.anno.Property.DEFAULT, zx.io.remote.anno.Property.DEFAULT, zx.server.anno.LastModified.DEFAULT, zx.utils.anno.Json.PUBLIC]
    },

    /** Which object "owns" (ie uploaded) the file. This should be a business object in your application.*/
    owner: {
      init: null,
      nullable: true,
      check: "zx.server.Object",
      event: "changeOwner",
      "@": [zx.io.persistence.anno.Property.DEFAULT, zx.io.remote.anno.Property.DEFAULT, zx.server.anno.LastModified.DEFAULT]
    },

    /** Original filename of the file */
    originalFilename: {
      init: null,
      nullable: true,
      check: "String",
      event: "changeOriginalFilename",
      "@": [zx.io.persistence.anno.Property.DEFAULT, zx.io.remote.anno.Property.DEFAULT, zx.server.anno.LastModified.DEFAULT, zx.utils.anno.Json.PUBLIC]
    },

    /** Extension for the file and for URLs, including the "." */
    extension: {
      init: null,
      nullable: true,
      check: "String",
      event: "changeExtension",
      "@": [zx.io.persistence.anno.Property.DEFAULT, zx.io.remote.anno.Property.DEFAULT, zx.server.anno.LastModified.DEFAULT, zx.utils.anno.Json.PUBLIC]
    },

    /** Type of the file */
    type: {
      init: null,
      nullable: true,
      event: "changeType",
      "@": [zx.io.persistence.anno.Property.DEFAULT, zx.io.remote.anno.Property.DEFAULT, zx.server.anno.LastModified.DEFAULT, zx.utils.anno.Json.PUBLIC]
    },

    /** SHA */
    serverSha: {
      init: null,
      nullable: true,
      check: "String",
      event: "changeServerSha",
      "@": [zx.io.persistence.anno.Property.DEFAULT, zx.io.remote.anno.Property.DEFAULT, zx.server.anno.LastModified.DEFAULT, zx.utils.anno.Json.PUBLIC]
    }
  },

  members: {
    /**
     * Returns a filename where the blob is [to be] stored on disk
     *
     * @returns {String}
     */
    getFilename() {
      let server = zx.server.Standalone.getInstance();
      let filename = server.getBlobFilename(this.toUuid()) + (this.getExtension() || "");
      let dirname = path.dirname(filename);
      fs.mkdirSync(dirname, { recursive: true });
      return filename;
    },

    /**
     * Makes a name that can be used to identify this file, but is not the filename.  EG it is used
     * in downloads or email attachments
     *
     * @returns {String}
     */
    getPresentableFilename() {
      let name = this.getOriginalFilename();
      if (!name) {
        name = this.getTitle();
        if (name) {
          name
            .replace(/[^a-z0-9._-]+/gi, "-")
            .replace(/-+/g, "-")
            .replace(/-+$/, "")
            .replace(/^-+/, "");
        } else {
          name = this.toUuid();
        }
      }
      name += this.getExtension();
      return name;
    },

    "@deleteFromDisk": zx.io.remote.anno.Method.DEFAULT,
    async deleteFromDisk() {
      let fileName = this.getFilename();
      await fs.promises.rm(fileName);

      let server = zx.server.Standalone.getInstance();
      await server.deleteObject(this);
    }
  }
});
