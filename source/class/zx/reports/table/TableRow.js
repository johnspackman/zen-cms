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

qx.Class.define("zx.reports.table.TableRow", {
  extend: zx.reports.Block,

  construct(...columnAccessors) {
    super();
    this.__columnAccessors = columnAccessors.map(accessor => zx.reports.Utils.compileGetter(accessor));
  },

  members: {
    /** @type{(Function|String)[]?} accessors for the columns */
    __columnAccessors: null,

    /**
     * Finds the nearest parent table
     *
     * @returns {zx.reports.table.Table?}
     */
    getTable() {
      for (let tmp = this.getParent(); tmp; tmp = tmp.getParent()) {
        if (tmp instanceof zx.reports.table.Table) {
          return tmp;
        }
      }
      throw new Error("Cannot find table");
    },

    /**
     * Creates the output for the row
     *
     * @param {*} row the current row from the datasource
     */
    async executeRow(row) {
      let tds = [];
      for (let accessor of this.__columnAccessors) {
        let value = await this._render(await accessor(row), row);
        if (value !== null) {
          tds.push(<td>{value}</td>);
        } else {
          tds.push(<td>&nbsp;</td>);
        }
      }
      return <tr>{tds}</tr>;
    }
  }
});
