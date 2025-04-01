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

qx.Class.define("zx.reports.datasource.AbstractDataSource", {
  extend: qx.core.Object,
  implement: [zx.reports.datasource.IDataSource],

  members: {
    /** @type{String} the position, one of [ "before-start", "on-row", "at-eof", "beyond-eof" ] */
    __position: null,

    /**
     * @Override
     */
    async open() {
      if (this.__position !== null) {
        throw new Error("Cannot open a DataSource more than once");
      }
      this.__position = "before-start";
      await this._openImpl();
    },

    /**
     * @Override
     */
    close() {
      if (this.__position === null) {
        throw new Error("Cannot close a DataSource more than once");
      }
      this._closeImpl();
      this.__position = null;
    },

    /**
     * @Override
     */
    async next() {
      if (this.__position == "beyond-eof") {
        throw new Error(`Beyond EOF in report ${this}`);
      }

      if (this.__position == "at-eof") {
        this.__position = "beyond-eof";
        return false;
      }

      if (!(await this._nextImpl())) {
        this.__position = "at-eof";
        return false;
      } else {
        this.__position = "on-row";
        return true;
      }
    },

    /**
     * @Override
     */
    isAtEof() {
      return this.__position == "at-eof" || this.__position == "beyond-eof";
    },

    /**
     * @Override
     */
    current() {
      throw new Error(`No such implementation for ${this.classname}.current`);
    },

    /**
     * Called to implement open
     */
    async _openImpl() {
      // Nothing
    },

    /**
     * Called to implement close
     */
    _closeImpl() {
      // Nothing
    },

    /**
     * Implements the switch to the next row
     *
     * @return {Boolean} true if there was a new row
     */
    async _nextImpl() {
      throw new Error(`No such implementation for ${this.classname}._nextImpl`);
    }
  }
});
