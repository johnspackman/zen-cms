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
 * A Block outputs a horizontal chunk of data, including the output of any before and after blocks
 *
 */
qx.Class.define("zx.reports.Block", {
  extend: qx.core.Object,

  construct(fnOnRow, fnOnRowCsv) {
    super();
    this.__fnOnRow = fnOnRow;
    this.__fnOnRowCsv = fnOnRowCsv;
  },

  properties: {
    /** Optional parent block - do not set this manually */
    parent: {
      init: null,
      nullable: true,
      check: "zx.reports.Block"
    },

    /** Block executed before the content */
    before: {
      init: null,
      nullable: true,
      check: "zx.reports.Block",
      apply: "_applyBefore"
    },

    /** Block executed after the content */
    after: {
      init: null,
      nullable: true,
      check: "zx.reports.Block",
      apply: "_applyAfter"
    }
  },

  members: {
    __fnOnRow: null,
    __fnOnRowCsv: null,

    _applyBefore(value, old) {
      this._applyChild(value, old);
    },

    _applyAfter(value, old) {
      this._applyChild(value, old);
    },

    _applyChild(value, old) {
      if (old) {
        old.setParent(null);
      }
      if (value) {
        value.setParent(this);
      }
    },

    /**
     * Creates the output for before the row
     *
     * @param {*} row the current row from the datasource
     */
    async executeBefore(row) {
      let before = this.getBefore();
      return await this._render(before, row);
    },

    /**
     * Creates the output for before the row, when exporting to CSV
     *
     * @param {*} row the current row from the datasource
     */
    async executeAsCsvBefore(row) {
      let before = this.getBefore();
      return await this._renderCsv(before, row);
    },

    /**
     * Creates the output for after the row
     *
     * @param {*} row the current row from the datasource
     */
    async executeAfter(row) {
      let after = this.getAfter();
      return await this._render(after, row);
    },

    /**
     * Creates the output for after the row, when exporting to CSV
     *
     * @param {*} row the current row from the datasource
     */
    async executeAsCsvAfter(row) {
      let after = this.getAfter();
      return await this._renderCsv(after, row);
    },

    /**
     * Creates the output for the row
     *
     * @param {*} row the current row from the datasource
     */
    async executeRow(row) {
      if (!this.__fnOnRow) {
        throw new Error(`No onRow function defined for ${this.classname}`);
      }
      return await this._render(await this.__fnOnRow(row, this), row);
    },

    /**
     * Creates the output for the row, when exporting to CSV
     *
     * @param {*} row the current row from the datasource
     */
    async executeAsCsvRow(row) {
      if (!this.__fnOnRowCsv) {
        return;
      }
      return await this._renderCsv(await this.__fnOnRowCsv(row, this), row);
    },

    /**
     * Provides the an opportunity to wrap the content for a row
     *
     * @param {*} row the current row from the datasource
     * @param {qx.html.Element[]} content the content previously compiled for this group for the row
     * @returns
     */
    async executeWrap(row, content) {
      return content;
    },

    /**
     * Helper method that renders a block, depending on what it is.  Does nothing if block is null
     *
     * @param {zx.reports.Block|qx.html.Element?} block the block to render
     * @param {row} the current row from the datasource
     * @return {qx.html.Element?} the result
     */
    async _render(block, row) {
      if (block === null || block === undefined) {
        return null;
      }

      if (block instanceof qx.html.Node) {
        return block;
      } else if (block instanceof zx.reports.Block) {
        return await block.executeRow(row);
      } else if (qx.lang.Type.isArray(block) || block instanceof qx.data.Array) {
        let result = [];
        for (let child of block) {
          let childResult = await this._render(child, row);
          if (childResult) {
            result.push(childResult);
          }
        }
        return result;
      }

      let str = String(block);
      let segs = str.split(/(\r?\n)/);
      let result = [];
      for (let i = 0; i < segs.length; i++) {
        if (i > 0) {
          result.push(<br />);
        }
        result.push(segs[i]);
      }
      return result;
    },

    /**
     * Helper method that renders a block, depending on what it is.  Does nothing if block is null
     *
     * @param {zx.reports.Block|*?} block the block to render
     * @param {row} the current row from the datasource
     * @return {Object[]} the result
     */
    async _renderCsv(block, row) {
      if (block === null || block === undefined) {
        return null;
      }

      if (block instanceof zx.reports.Block) {
        return await block.executeAsCsvRow(row);
      } else if (qx.lang.Type.isArray(block) || block instanceof qx.data.Array) {
        let result = [];
        for (let child of block) {
          let childResult = await this._renderCsv(child, row);
          if (childResult) {
            result.push(childResult);
          }
        }
        return result;
      }

      let str = String(block);
      return str;
    }
  }
});
