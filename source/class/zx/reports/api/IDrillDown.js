qx.Interface.define("zx.reports.api.IDrillDown", {
  members: {
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
    setGroupFilters(groupFilters) {}
  }
});
