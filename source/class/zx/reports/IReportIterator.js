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
 * A ReportIterator is an object that can be used to iterate over a report
 * and generate the report, outputting as HTML or CSV
 */
qx.Interface.define("zx.reports.IReportIterator", {
  members: {
    /**
     * Executes the report
     *
     * @returns {Promise<qx.html.Element>}
     */
    async execute() {},

    /**
     * Executes the report
     *
     * @returns {Promise<String[]>}
     */
    async executeAsCsv() {}
  }
});
