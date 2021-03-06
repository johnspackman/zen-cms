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
 * Implements a database using MongoDB
 */
qx.Class.define("zx.io.persistence.db.MongoDatabase", {
  extend: zx.io.persistence.db.Database,

  construct(options) {
    this.base(arguments);
    this.__uri = options.uri;
    this.__databaseName = options.databaseName;
    this.__collectionName = options.collectionName;
  },

  destruct() {
    if (this.__mongo) this.close();
  },

  members: {
    /** @type{String} the URI of the database to connect to */
    __uri: null,

    /** @type{String} the name of the database */
    __databaseName: null,

    /** @type{String} the name of the collection */
    __collectionName: null,

    /** @type{MongoClient} the Mongo client instance */
    __mongo: null,

    /** @type{MongoClient.DB} the Mongo database */
    __db: null,

    /** @type{MongoClient.Collection} the Mongo collection */
    __collection: null,

    /** @type{Boolean} true if the collection did not exist when the database was opened */
    __newDatabase: false,

    /*
     * @Override
     */
    async open() {
      const { MongoClient } = require("mongodb");
      this.__mongo = new MongoClient(this.__uri);
      await this.__mongo.connect();
      this.__db = this.__mongo.db(this.__databaseName);
      let collections = await this.__db.collections();
      let exists = collections.find(
        coll => coll.collectionName == this.__collectionName
      );
      this.__newDatabase = !exists;
      this.__collection = this.__db.collection(this.__collectionName);

      return await this.base(arguments);
    },

    /**
     * Detects whether the collection existed when the database was opened
     *
     * @return {Boolean}
     */
    isNewDatabase() {
      return this.__newDatabase;
    },

    /*
     * @Override
     */
    async close() {
      if (this.__mongo) {
        this.__mongo.close();
        this.__mongo = null;
        this.__db = null;
        this.__collection = null;
      }
      await this.base(arguments);
    },

    /*
     * @Override
     */
    async save() {},

    /*
     * @Override
     */
    async flush() {},

    /*
     * @Override
     */
    async find(query, projection) {
      let result = await this.__collection.find(query, { projection });
      return result;
    },

    /*
     * @Override
     */
    async findOne(query, projection) {
      let json = await this.__collection.findOne(query, { projection });
      return json;
    },

    /*
     * @Override
     */
    async getDataFromUuid(uuid) {
      let data = await this.findOne({ _id: uuid });
      if (!data) return null;
      return {
        json: data
      };
    },

    /*
     * @Override
     */
    async getDataFromQuery(query, projection) {
      let data = await this.findOne(query, projection);
      if (!data) return null;
      return {
        json: data
      };
    },

    /*
     * @Override
     */
    async _sendJson(uuid, json) {
      json._id = json._uuid;
      await this.__collection.replaceOne({ _id: uuid }, json, { upsert: true });
    },

    /*
     * @Override
     */
    async removeByUuid(uuid) {
      await this.__collection.deleteOne({ _id: uuid }, {});
      return true;
    },

    /*
     * @Override
     */
    async findAndRemove(query) {
      await this.__collection.deleteMany(query, {});
      return true;
    }
  }
});
