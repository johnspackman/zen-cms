qx.Interface.define("zx.reports.api.IReportDiscovery", {
  members: {
    /**
     * Returns the IDs of the available reports; the IDs are iused to generate a URL
     * to connect APIs to the report
     *
     * @typedef {Object} ReportDescriptor
     * @property {String} id - The ID of the report
     * @property {String} name - The name of the report
     *
     * @returns {Promise<ReportDescriptor[]>}
     */
    async getAvailableReports() {},

    /**
     * Makes the report with the given ID visible on screen
     *
     * @param {String} reportId
     */
    async setActiveReportId(reportId) {},

    /**
     * Sets the report parameters
     *
     * @param params {Object}
     */
    async setReportParams(params) {}
  }
});
