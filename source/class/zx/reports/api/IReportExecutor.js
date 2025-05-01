qx.Interface.define("zx.reports.api.IReportExecutor", {
  members: {
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
    async execute(format) {},

    /**
     * Returns Drill down data
     *
     * @returns {Promise<*>}
     */
    getDrilldown() {},

    /**
     * Sets the group filters; each element in the array can be one of:
     *  - a Function that returns true or false and is called with the group value and row
     *  - a String that is the UUID of the group to match
     *  - a String[] that is the UUIDs of the groups to match
     *  - null, which means no filter
     * @param {(Function|String)[]} groupFilters
     */
    setGroupFilters(groupFilters) {},

    /**
     * Triggers the browser to print the report, popping up the print dialog
     */
    triggerPrintDialog() {},

    /**
     * Triggers the browser to save the report as a CSV file, popping up the save dialog
     */
    triggerSaveAsCsvDialog() {}
  }
});
