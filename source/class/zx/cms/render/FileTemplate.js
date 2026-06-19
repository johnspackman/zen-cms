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
 * File based template
 */
qx.Class.define("zx.cms.render.FileTemplate", {
  extend: zx.cms.render.Template,

  construct(filename, classname, name) {
    super(classname, name);
    this.__filename = filename;
  },

  members: {
    __filename: null,

    /*
     * @Override
     */
    async getSource() {
      return await fs.promises.readFile(this.__filename, "utf8");
    },

    /*
     * @Override
     */
    getWatchFilename() {
      return this.__filename;
    },

    /*
     * @Override
     * @ignore(process)
     */
    toUri() {
      return path.relative(process.cwd(), this.__filename);
    },

    /*
     * @Override
     */
    toString() {
      return this.toUri();
    }
  }
});
