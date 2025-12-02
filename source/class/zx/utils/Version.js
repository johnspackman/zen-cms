qx.Class.define("zx.utils.Version", {
  type: "static",
  statics: {
    /**
     * Parses a version string in the format "major.minor.patch".
     *
     * @param {string} versionString
     * @returns {Data}
     *
     * @typedef Data
     * @property {number} major
     * @property {number} minor
     * @property {number} patch
     *
     */
    parse(versionString) {
      let parts = versionString.split(".");
      return {
        major: parseInt(parts[0], 10),
        minor: parseInt(parts[1], 10) || 0,
        patch: parseInt(parts[2], 10) || 0
      };
    }
  }
});
