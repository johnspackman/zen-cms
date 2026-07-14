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

const fs = require("fs-extra");
const path = require("path");

/**
 * Helper class for import/export
 */
qx.Class.define("zx.io.persistence.db.ImportExport", {
  extend: qx.core.Object,

  /**
   * Constructor
   *
   * @param rootDir {String} directory to import/export from/to
   * @param db {Database} the database
   */
  construct(rootDir, db) {
    super();
    this.__rootDir = rootDir;
    this.__db = db;
  },

  members: {
    /** @type{String} the directory */
    __rootDir: null,

    /** @type{Database} the database */
    __db: null,

    /**
     * Imports from disk to the database
     */
    async importToDb() {
      let websiteName = zx.server.Standalone.getInstance().getWebsiteName();
      const scan = async (dir, url) => {
        let files = await fs.readdir(dir, {
          encoding: "utf8",
          withFileTypes: true
        });

        for (let i = 0; i < files.length; i++) {
          let file = files[i];
          if (file.isDirectory()) {
            let fileUrl = (url.length ? url + "/" : "") + file.name;
            await scan(path.join(dir, file.name), fileUrl);
            continue;
          }
          let extension = path.extname(file.name);
          if (!file.isFile() || extension != ".json") {
            continue;
          }

          let name = file.name.substring(0, file.name.length - extension.length);
          let fileUrl = (url.length ? url + "/" : "") + name;

          let filename = path.join(this.__rootDir, url, file.name);
          let data = await fs.readFile(filename, { encoding: "utf8" });
          data = data.trim();
          if (!data.length) {
            let current = this.__db.findOne("zx.cms.content.Page", { websiteName, url: fileUrl });
            if (current) {
              await this.__db.removeByUuid(current._classname, current._uuid);
            }
          } else {
            let json;
            try {
              json = JSON.parse(data);
            } catch (ex) {
              this.error(`Cannot parse JSON in ${filename}: ${ex}`);
              continue;
            }

            let htmlFilename = path.join(this.__rootDir, url, name + ".html");
            if (fs.existsSync(htmlFilename)) {
              let html = await fs.readFile(htmlFilename, { encoding: "utf8" });
              json.pieces = [
                {
                  "_classname": "zx.cms.content.ContentPiece",
                  "content": html
                }
              ];
            }

            if (json.url && json.url.toLowerCase() != fileUrl.toLowerCase()) {
              this.warn(`The URL in ${filename} is wrong, found ${json.url} changing to ${fileUrl}`);
            }

            if (!url.endsWith("/_uuids")) {
              json.url = fileUrl;
            } else if (!json._uuid) {
              json._uuid = name;
            } else if (json._uuid.toLowerCase() != name.toLowerCase()) {
              this.error(`The file ${filename} has the wrong UUID, not importing`);
              continue;
            }

            if (!json._uuid) {
              let clazz = qx.Class.getByName(json._classname);
              if (!clazz) {
                this.error(`Cannot find class ${json._classname}`);
                continue;
              }
              let current = await this.__db.findOne(clazz, { websiteName, url: fileUrl });
              if (current) {
                json._uuid = current._uuid;
              } else {
                json._uuid = this.__db.createUuid();
              }
            }
            json.websiteName = websiteName;
            await this.__db._sendJson(json._uuid, json);
          }
        }
      };
      await scan(this.__rootDir, "");
      await this.__db.flush();
      await this.__db.save();
    },

    async _importJson(json, url) {

    },

    /**
     * Exports from the database to disk
     */
    async exportFromDb() {
      let docs = await this.__db.find({});
      for (let i = 0; i < docs.length; i++) {
        let doc = docs[i];
        let filename = doc.url ? path.join(this.__rootDir, doc.url + ".json") : path.join(this.__rootDir, "_uuids", doc._uuid);
        await fs.ensureDir(path.dirname(filename));
        await fs.writeFile(filename, JSON.stringify(doc, null, 2), {
          encoding: "utf8"
        });
      }
    }
  }
});
