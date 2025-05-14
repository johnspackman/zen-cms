/**
 * Drop in replacement for qx.util.format.DateFormat which will format and parse the Date
 * object in UTC time.
 */
qx.Class.define("zx.utils.format.DateFormat", {
  extend: qx.util.format.DateFormat,

  properties: {
    /** Whether to treat as UTC */
    lockToUtc: {
      check: "Boolean",
      init: true
    }
  },

  members: {
    /**
     * @Override
     */
    format(date) {
      if (this.getLockToUtc()) {
        date = new Date(date.getTime() + date.getTimezoneOffset() * 60 * 1000);
      }
      return super.format(date);
    },

    /**
     * @Override
     */
    parse(value) {
      let date = super.parse(value);
      if (this.getLockToUtc()) {
        date = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
      }
      return date;
    }
  }
});
