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

const fs = require("fs");

qx.Class.define("zx.utils.LogFilter", {
  extend: qx.core.Object,

  statics: {
    /**
     * Loads the log filters from the given file
     *
     * @param {String} filename
     */
    async loadFilters(filename) {
      let data = await zx.utils.Json.loadJsonAsync(filename);

      const loadFilters = appData => {
        if (!appData) {
          return;
        }
        for (let appenderId in appData) {
          let filters = appData[appenderId];
          for (let key in filters) {
            qx.log.Logger.addFilter(new RegExp(key), appenderId, filters[key]);
          }
        }
      };

      loadFilters(data.default);
      let appName = qx.core.Environment.get("qx.compiler.applicationName");
      loadFilters(data[appName]);
    },

    /**
     * Loads log filters, looking for the file in the current directory; the filename
     * is based on the environment variable zx.utils.LogFilter.filename (which defaults
     * to `log-filters.json`) -- however, first it will look for a filename with
     * ".local" inserted before the extension, eg "log-filters.local.json"
     */
    async loadFiltersAutoDetect() {
      let filename = qx.core.Environment.get("zx.utils.LogFilter.filename");
      let pos = filename.lastIndexOf(".");
      let localFilename = filename.substring(0, pos) + ".local" + filename.substring(pos);

      if (fs.existsSync(localFilename)) {
        await this.loadFilters(localFilename);
      } else if (fs.existsSync(filename)) {
        await this.loadFilters(filename);
      }
    }
  },

  environment: {
    /** Base filename for the filters to be loaded from */
    "zx.utils.LogFilter.filename": "log-filters.json"
  }
});
