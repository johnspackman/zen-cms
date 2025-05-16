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

  properties: {
    cssClass: {
      init: null,
      nullable: true,
      check: "String"
    },

    /**
     * Where to place the CSV fields (if provided) in relation to the existing fields (provided via columnaccessors)
     */
    placeCsvValues: {
      init: "auto",
      check: ["prepend", "append", "override", "auto"],
      event: "changePlaceCsvValues"
    }
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
     * @param {(string|Function)[]} accessors
     *
     * Extra fields to include if we are in a CSV file.
     * This is because, unlike visual reports, CSV files are often desired to be a strict 2D grid, and hence cannot have headings/subheadings
     * Therefore, it will be useful to add the heading information into each row
     */
    setCsvColumnAccessors(accessors) {
      this.__csvColumnAccessors = accessors.map(accessor => zx.reports.Utils.compileGetter(accessor));
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
      let tr = <tr>{tds}</tr>;
      if (this.getCssClass()) {
        tr.setCssClass(this.getCssClass());
      }
      return tr;
    },

    /**
     * Creates the output for the row
     *
     * @param {*} row the current row from the datasource
     */
    async executeAsCsvRow(row) {
      let cells = [];

      let accessors = this.__columnAccessors;

      if (this.__csvColumnAccessors) {
        switch (this.getPlaceCsvValues()) {
          case "prepend":
            accessors = [...this.__csvColumnAccessors, ...accessors];
            break;
          case "append":
            accessors = [...accessors, ...this.__csvColumnAccessors];
            break;
          case "override":
            accessors = this.__csvColumnAccessors;
            break;
          case "auto":
            if (this.__csvColumnAccessors.length) {
              accessors = this.__csvColumnAccessors;
            } else {
              accessors = this.__columnAccessors;
            }
            break;
        }
      }

      for (let accessor of accessors) {
        let value = await this._renderCsv(await accessor(row), row);
        if (value !== null) {
          cells.push(value);
        } else {
          cells.push("");
        }
      }
      return cells;
    }
  }
});
