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
