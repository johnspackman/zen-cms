qx.Interface.define("zx.reports.api.IReportDescriptor", {
  members: {
    /**
     * Returns the report ID
     *
     * @returns {String}
     */
    getId() {},

    /**
     * Returns the report name
     *
     * @returns {String}
     */
    getName() {},

    /**
     * Returns the formats supported by the report.  The order of the formats
     * is important, because the first in the array is the default format for the report
     *
     * @returns {String[]} can be one or more of: "csv" and "html"
     */
    getFormats() {},

    /**
     * Sets the report parameters
     *
     * @param params {Object}
     */
    async setParams(params) {},

    /**
     * Runs the report, the format is one of the formats returned by getFormats()
     *
     * @param {String} format
     */
    async execute(format) {}
  }
});
