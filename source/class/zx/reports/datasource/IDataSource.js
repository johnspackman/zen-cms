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

qx.Interface.define("zx.reports.datasource.IDataSource", {
  members: {
    /**
     * Opens the data source and advances to the first row
     */
    async open() {},

    /**
     * Closes the data source
     */
    close() {},

    /**
     * Moves to the next row
     * @return {Boolean} true if there is a row to read (ie false if at EOF)
     */
    async next() {},

    /**
     * Tests whether at EOF or not
     *
     * @returns {Boolean}
     */
    isAtEof() {},

    /**
     * Returns the current row/object
     */
    current() {}
  }
});
