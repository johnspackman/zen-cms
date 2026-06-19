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
 * Implements a database entire in memory
 */
qx.Class.define("zx.io.persistence.db.MemoryDatabase", {
  extend: zx.io.persistence.db.Database,

  members: {
    _db: null,

    /**
     * Imports the database from disk
     *
     * @param dir {String} the directory to import from
     * @param erase {Boolean?} it true, the current in memory database will be erased
     */
    async importFromDisk(dir, erase) {
      if (erase) {
        this._db = { jsonByUuid: {} };
      }
      await new zx.io.persistence.db.ImportExport(dir, this).importToDb();
    },

    /*
     * @Override
     */
    async open() {
      this._db = {
        jsonByUuid: {}
      };

      return await super.open();
    },

    /*
     * @Override
     */
    async close() {
      this._db = null;
      await super.close();
    },

    /*
     * @Override
     */
    async save() {},

    /*
     * @Override
     */
    async findOne(query, projection) {
      for (let uuid in this._db.jsonByUuid) {
        let json = this._db.jsonByUuid[uuid];
        if (zx.io.persistence.db.Utils.matchQuery(json, query)) {
          return json;
        }
      }
      return null;
    },

    /*
     * @Override
     */
    async find(query, projection) {
      let result = [];
      for (let uuid in this._db.jsonByUuid) {
        let json = this._db.jsonByUuid[uuid];
        if (zx.io.persistence.db.Utils.matchQuery(json, query)) {
          result.push(json);
        }
      }
      return result;
    },

    /*
     * @Override
     */
    getDataFromUuid(clazz, uuid) {
      let data = this._db.jsonByUuid[uuid] || null;
      if (!data) {
        this.warn("Cannot find document with uuid=" + uuid);
      }
      return {
        json: data
      };
    },

    /*
     * @Override
     */
    async _sendJson(uuid, json) {
      this._db.jsonByUuid[uuid] = json;
      return uuid;
    },

    /*
     * @Override
     */
    async remove(uuid) {
      if (!this._db.jsonByUuid[uuid]) {
        return false;
      }
      delete this._db.jsonByUuid[uuid];
      return true;
    }
  }
});
