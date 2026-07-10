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
 * Allows rendering to disk
 */
qx.Class.define("zx.cms.render.DiskRendering", {
  extend: zx.cms.render.AbstractRendering,

  /**
   *
   * @param {string} filename path to output file to render page
   * @param {Object<string, string>} query
   * @param {Object<string, string>} headers
   */
  construct(filename, query, headers) {
    super();
    this.__filename = filename;
    this.__query = query || {};
    this.__headers = headers || {};
    this.__promises = [];
  },

  members: {
    /**
     * @type {string}
     */
    __filename: null,
    /**
     * @type {Object<string, string>}
     */
    __query: null,
    /**
     * @type {Object<string, string>}
     */
    __headers: null,
    __statusCode: 200,
    /**
     * @type {string?}
     */
    __statusMessage: null,
    /**
     * @type {Array<Promise>}
     */
    __promises: [],

    /*
     * @Override
     */
    getHeader(name) {
      return this.__headers[name] || null;
    },

    /*
     * @Override
     */
    getQuery() {
      return this.__query;
    },

    /*
     * @Override
     */
    getUser() {
      return null;
    },

    /*
     * @Override
     */
    setStatus(statusCode, message) {
      this.__statusCode = statusCode;
      this.__statusMessage = message || null;
    },

    /*
     * @Override
     */
    setResponseHeader(key, value) {
      // Not implemented
    },

    /*
     * @Override
     */
    send(body) {
      let p = fs.writeFile(this.__filename, body, "utf8");
      this.__promises.push(p);
    },

    /*
     * @Override
     */
    sendFile(filename, options) {
      let srcFilename;
      if (options && options.root) {
        srcFilename = path.resolve(options.root, filename);
      } else srcFilename = path.resolve(filename);
      let p = fs.copy(srcFilename, this.__filename, {
        overwrite: true,
        preserveTimestamps: true
      });

      this.__promises.push(p);
    },

    /**
     * Because this is for serialization to disk, this needs to be called to wait for all
     * serialization activity to be completed.
     */
    async waitForAll() {
      await Promise.all(this.__promises);
    }
  }
});
