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

qx.Class.define("zx.reports.table.Table", {
  extend: zx.reports.Group,

  construct(...captions) {
    super();
    this.__captions = captions;
  },

  members: {
    /**
     * @override
     */
    async executeAsCsvBefore(row) {
      return this.__captions;
    },

    /**
     * @override
     */
    async executeWrapBody(row, content) {
      return [
        <table>
          <thead>
            <tr>
              {this.__captions.map(caption => (
                <th>{caption}</th>
              ))}
            </tr>
          </thead>
          <tbody>{content}</tbody>
        </table>
      ];
    }
  }
});
