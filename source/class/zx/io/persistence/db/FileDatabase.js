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

const fs = require("fs");
const path = require("path");

/**
 * Implements a database using the disk
 *
 * @deprecated
 *
 * NOTE :: You probably don't want this - it was built for quick and dirty testing
 * during development, but has been replaced with the NedbDatabase implementation
 * (which also gives the find and findOne implementations).
 *
 */
qx.Class.define("zx.io.persistence.db.FileDatabase", {
  extend: zx.io.persistence.db.Database,

  construct(rootDir) {
    super();
    this.__rootDir = rootDir;
    this.__debounceSaveImpl = zx.utils.Function.debounce(() => this._saveImpl(), 250);
  },

  members: {
    __rootDir: null,
    __debounceSaveImpl: null,
    _db: null,

    /*
     * @Override
     */
    async open() {
      if (!fs.existsSync(this.__rootDir)) {
        throw new Error("Cannot find root directory for database: " + this.__rootDir);
      }
      this._db = await zx.utils.Json.loadJsonAsync(path.join(this.__rootDir, "db.json"));
      if (!this._db) {
        this._db = {
          ids: {},
          idFromFilename: {}
        };
      }
      if (!fs.existsSync(path.join(this.__rootDir, "_uuids"))) {
        await fs.promises.mkdir(path.join(this.__rootDir, "_uuids"));
      }
      return await super.open();
    },

    /*
     * @Override
     */
    async close() {
      await this._saveImpl();
      this._db = null;
      await super.close();
    },

    /*
     * @Override
     */
    async save() {
      this.__debounceSaveImpl();
    },

    /**
     * Saves the database; use `__debounceSaveImpl` normally
     */
    async _saveImpl() {
      if (this._db) {
        await zx.utils.Json.saveJsonAsync(path.join(this.__rootDir, "db.json"), this._db);
      }
    },

    /*
     * @Override
     */
    async getDataFromUuid(clazz, uuid) {
      let indexData = this._db.ids[uuid];
      if (!indexData) {
        this.warn("Cannot find document with uuid=" + uuid);
        return null;
      }
      const filename = path.join(this.__rootDir, indexData.filename);
      let mtime = null;
      try {
        let stat = await fs.promises.stat(filename);
        mtime = stat.mtime;
      } catch (ex) {
        throw new Error(`Cannot find data for uuid ${uuid}: ${ex}`);
      }
      let data = await zx.utils.Json.loadJsonAsync(filename);
      if (!data._uuid) {
        data._uuid = uuid;
      } else if (data._uuid != uuid) {
        throw new Error(`Error while loading ${uuid} - file ${indexData.filename} has wrong uuid, found ${data._uuid}`);
      }
      return {
        json: data,
        mtime: mtime,
        async isStale() {
          let stat = await fs.promises.stat(filename, { throwIfNoEntry: false });
          // File has been deleted
          if (!stat) {
            return true;
          }
          return stat && stat.mtime.getTime() > mtime.getTime();
        }
      };
    },

    /*
     * @Override
     */
    async _sendJson(uuid, json) {
      let indexData = this._db.ids[uuid];
      if (!indexData) {
        let filename = path.resolve(this.__rootDir, "_uuids/" + uuid + ".json");
        let relative = path.relative(this.__rootDir, filename);
        indexData = this._db.ids[uuid] = {
          filename: relative
        };

        this._db.idFromFilename[indexData.filename] = uuid;
        this.__debounceSaveImpl();
      }
      await zx.utils.Json.saveJsonAsync(path.join(this.__rootDir, indexData.filename), json);
      return uuid;
    },

    /*
     * @Override
     */
    async remove(uuid) {
      let indexData = this._db.ids[uuid];
      if (!indexData) {
        this.error("Cannot delete UUID because it does not exist");
        return false;
      }
      await fs.promises.unlink(path.join(this.__rootDir, indexData.filename));
      delete this._db.ids[uuid];
      delete this._db.idFromFilename[indexData.filename];
      return true;
    }
  }
});
