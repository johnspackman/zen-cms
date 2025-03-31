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

/**
 * @deprecated use `zx.utils.mongo.MMongoClient` instead
 *
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
 */
/**
 * Static class containing helper functions for MongoDB
 */
qx.Class.define("zx.utils.mongo.MongoHelpers", {
  statics: {
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
