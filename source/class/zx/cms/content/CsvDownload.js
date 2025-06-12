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

qx.Class.define("zx.cms.content.CsvDownload", {
  extend: zx.io.persistence.Object,
  implement: [zx.cms.render.IRawViewable],
  "@": [new zx.io.remote.anno.Class()],

  properties: {
    title: {
      check: "String",
      event: "changeTitle",
      "@": [zx.io.persistence.anno.Property.DEFAULT, zx.io.remote.anno.Property.DEFAULT]
    },

    contentType: {
      init: "text/csv; charset=UTF-8",
      check: "String",
      event: "changeContentType",
      "@": [zx.io.persistence.anno.Property.DEFAULT, zx.io.remote.anno.Property.DEFAULT]
    },

    csvGenerator: {
      init: null,
      nullable: true,
      check: "String",
      event: "changeCsvGenerator",
      "@": [zx.io.persistence.anno.Property.DEFAULT, zx.io.remote.anno.Property.DEFAULT]
    },

    downloadFilename: {
      init: null,
      nullable: true,
      check: "String",
      event: "changeDownloadFilename",
      "@": [zx.io.persistence.anno.Property.DEFAULT, zx.io.remote.anno.Property.DEFAULT]
    }
  },

  members: {
    /**
     * @Override
     */
    async generate(request, reply) {
      let data = await this._generateCsv(request.query);

      reply.header("Content-Type", this.getContentType());
      let filename = this.getDownloadFilename();
      if (filename) {
        reply.header("Content-Disposition", `attachment; filename="${filename}"`);
      }

      if (data instanceof qx.html.Node) {
        data = data.serialize();
      } else if (data && !(typeof data == "string")) {
        data = JSON.stringify(data, null, 2);
      }
      await reply.send(data || "");
    },

    /**
     * Generates the CSV content.
     *
     * @param {Object<String,String>} query The query parameters.
     * @returns {Promise<String>}
     */
    async _generateCsv(query) {
      let clazz = qx.Class.getByName(this.getCsvGenerator());
      if (clazz == null) {
        throw new Error("Cannot find class " + this.getCsvGenerator());
      }
      let generator = new clazz();
      let result = await generator.generateCsv(query);
      if (typeof generator.getDownloadFilename == "function") {
        let filename = generator.getDownloadFilename();
        if (filename) {
          this.setDownloadFilename(filename);
        }
      }
      return result;
    }
  }
});
