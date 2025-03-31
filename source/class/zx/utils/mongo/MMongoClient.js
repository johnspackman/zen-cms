/**
 * @typedef {{
 *   from: string;
 *   as: string;
 *   localField: string;
 *   foreignField?: string;
 * } | {
 *   from: string;
 *   as: string;
 *   let?: Record<string, any>;
 *   pipeline: any[];
 * } | {
 *   from: string;
 *   as: string;
 *   localField: string;
 *   foreignField?: string;
 *   let?: Record<string, any>;
 *   pipeline: any[];
 * }} $lookup
 *
 * @typedef {import("mongodb").Document} MongoDocument
 */
qx.Mixin.define("zx.utils.mongo.MMongoClient", {
  properties: {
    debug: {
      init: false,
      check: "Boolean"
    }
  },

  members: {
    /**
     * Outputs mongo query details if `debug` is true
     *
     * @param {String|qx.Class} clazz
     * @param {*} args
     */
    _debugMongo(clazz, ...args) {
      if (this.isDebug()) {
        this.debug("Mongo: " + clazz + " " + args.map(arg => JSON.stringify(arg)).join(", "));
      }
    },

    /**
     * Simple wrapper for database `find` with debug output
     *
     * @param {String|qx.Class} clazz
     * @param {import("mongodb").Filter<MongoDocument>} query
     * @returns {Promise<import("mongodb").FindCursor>}
     */
    async find(clazz, query) {
      this._debugMongo(clazz, query);
      return await zx.server.Standalone.getInstance().getDb().find(clazz, query);
    },

    /**
     * Simple wrapper to test whether any rows exist for a query
     *
     * @param {String|qx.Class} clazz
     * @param {import("mongodb").Filter<MongoDocument>} query
     * @returns {Promise<Boolean>}
     */
    async existsAny(clazz, query) {
      this._debugMongo(clazz, query);
      let cursor = await zx.server.Standalone.getInstance().getDb().find(clazz, query);
      let exists = await cursor.hasNext();
      await cursor.close();
      return exists;
    },

    /**
     * Simple wrapper for database `find` with debug output
     *
     * @param {String|qx.Class} clazz
     * @param {import("mongodb").Filter<MongoDocument>} query
     * @returns {Promise<import("mongodb").WithId<unknown>>}
     */
    async findOne(clazz, query) {
      this._debugMongo(clazz, query);
      return await zx.server.Standalone.getInstance().getDb().findOne(clazz, query);
    },

    /**
     * Simple wrapper for database `insertOne` with debug output
     *
     * @param {String|qx.Class} clazz
     * @param {MongoDocument} row
     * @returns {Promise<import("mongodb").InsertOneResult>}
     */
    async insertOne(clazz, row) {
      this._debugMongo(clazz, row);
      /**@type {import("mongodb").Collection}*/
      let collection = await zx.server.Standalone.getInstance().getDb().getCollection(clazz);
      return await collection.insertOne(row);
    },

    /**
     * Simple wrapper for database `insertMany` with debug output
     *
     * @param {String|qx.Class} clazz
     * @param {MongoDocument[]} rows
     * @returns {Promise<import("mongodb").InsertManyResult>}
     */
    async insertMany(clazz, rows) {
      this._debugMongo(clazz, rows);
      /**@type {import("mongodb").Collection}*/
      let collection = await zx.server.Standalone.getInstance().getDb().getCollection(clazz);
      return await collection.insertMany(rows);
    },

    /**
     * Simple wrapper for database `deleteOne` with debug output
     *
     * @param {String|qx.Class} clazz
     * @param {import("mongodb").Filter<MongoDocument>} query
     * @returns {Promise<import("mongodb").DeleteResult>}
     */
    async deleteOne(clazz, query) {
      this._debugMongo(clazz, query);
      /**@type {import("mongodb").Collection}*/
      let collection = await zx.server.Standalone.getInstance().getDb().getCollection(clazz);
      return await collection.deleteOne(query);
    },

    /**
     * Simple wrapper for database `deleteMany` with debug output
     *
     * @param {String|qx.Class} clazz
     * @param {import("mongodb").Filter<MongoDocument>} query
     * @returns {Promise<import("mongodb").DeleteResult>}
     */
    async deleteMany(clazz, query) {
      this._debugMongo(clazz, query);
      /**@type {import("mongodb").Collection}*/
      let collection = await zx.server.Standalone.getInstance().getDb().getCollection(clazz);
      return await collection.deleteMany(query);
    },

    /**
     * Simple wrapper for database `aggregate` with debug output
     *
     * @param {String|qx.Class} clazz
     * @param {MongoDocument[]} query
     * @returns {Promise<import("mongodb").AggregationCursor>}
     */
    async aggregate(clazz, query) {
      this._debugMongo(clazz, query);
      /**@type {import("mongodb").Collection}*/
      let collection = zx.server.Standalone.getInstance().getDb().getCollection(clazz);
      return await collection.aggregate(query);
    },

    /**
     * Simple wrapper for database `aggregate` which enforces zero or one results, with debug output
     *
     * @param {String|qx.Class} clazz
     * @param {MongoDocument[]} query
     * @returns {Promise<import("mongodb").Document>}
     */
    async aggregateOne(clazz, query) {
      this._debugMongo(clazz, query);
      /**@type {import("mongodb").Collection}*/
      let collection = zx.server.Standalone.getInstance().getDb().getCollection(clazz);
      let cursor = await collection.aggregate(query);
      if (!(await cursor.hasNext())) {
        return null;
      }
      let result = await cursor.next();
      if (await cursor.hasNext()) {
        throw new Error("More than one document found");
      }
      return result;
    },

    /**
     * Simple wrapper for database `updateOne` with debug output
     *
     * @param {String|qx.Class} clazz
     * @param {import("mongodb").Filter<MongoDocument>} query
     * @param {import("mongodb").UpdateFilter<MongoDocument>|Partial<MongoDocument>} update
     * @returns {Promise<import("mongodb").UpdateResult>}
     */
    async updateOne(clazz, query, update) {
      this._debugMongo(clazz, query, update);
      /**@type {import("mongodb").Collection}*/
      let collection = zx.server.Standalone.getInstance().getDb().getCollection(clazz);
      return await collection.updateOne(query, update);
    },

    /**
     * Shorthand for `set( field = first( field ) )`
     * @param {string} name The name of the array field to set to it's first item
     * @example
     * ```js
     * collection.aggregate([
     *   uk.co.spar.services.MongoUtil.setToFirst("$someField"),
     * ]);
     * ```
     */
    setToFirst(name) {
      return /**@type {const}*/ {
        $set: { [name]: { $first: `$${name}` } }
      };
    },
    /**
     * Shorthand for `lookup( field = ... ), set( field = first( field ) )`
     * @param {$lookup} lookup The lookup to perform. `.foreignField` defaults to `"_uuid"`
     * @example
     * ```js
     * collection.aggregate([
     *   ...zx.utils.mongo.MongoHelpers.lookupFirst({ from: "otherCollection", localField: "thing.id", foreignField: "_id", as: "field" }),
     *   ...zx.utils.mongo.MongoHelpers.lookupFirst({
     *     // from: defaults to "documents"
     *     localField: "thing.id",
     *     // foreignField: defaults to "_uuid"
     *     as: "field"
     *   }),
     *   ...zx.utils.mongo.MongoHelpers.lookupFirst({
     *     from: "otherCollection",
     *     let: { thingId: "$thing.id" },
     *     pipeline: [{ $match: { $expr: { $eq: ["$$thingId", "$_id"] } } }],
     *     as: "field"
     *   }),
     * ]);
     * ```
     * @returns {{$lookup: Object}[]}
     */
    lookupFirst(lookup) {
      if (!lookup.from) {
        throw new Error("lookupFirst: `from` must be specified");
      }
      if (!lookup.as) {
        throw new Error("lookupFirst: `as` must be specified");
      }
      if ("localField" in lookup) {
        lookup.foreignField ??= "_uuid";
      }
      return /**@type {const}*/ [
        {
          $lookup: lookup
        },
        /**@type {typeof this.setToFirst} */ zx.utils.mongo.MongoHelpers.setToFirst(lookup.as)
      ];
    },
    /**
     * Partial, case insensitive match
     */
    partialMatch(query) {
      return { $regex: query, $options: "i" };
    },

    /**
     * Case insensitive match
     */
    insensitiveMatch(query) {
      return { $regex: "^" + query + "$", $options: "i" };
    }
  }
});
