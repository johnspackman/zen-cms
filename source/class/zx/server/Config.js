/* ************************************************************************
 *
 *  Zen [and the art of] CMS
 *
 *  https://zenesis.com
 *
 *  Copyright:
 *    2019-2022 Zenesis Ltd, https://www.zenesis.com
 *
 *  License:
 *    MIT (see LICENSE in project root)
 *
 *  Authors:
 *    John Spackman (john.spackman@zenesis.com, @johnspackman)
 *
 * ************************************************************************ */

const path = require("path");
const fs = require("fs");

qx.Class.define("zx.server.Config", {
  extend: qx.core.Object,

  /**
   * Constructor
   */
  construct() {
    super();
  },

  /**
   * Destructor
   */
  destruct() {
    if (zx.server.Config.__instance === this) {
      zx.server.Config.__instance = null;
    }
  },

  environment: {
    /** @type{Class?} the class to use to load the config; null means to use zx.server.Config */
    "zx.server.Config.ConfigLoaderClass": null
  },

  members: {
    /** @type{Object} the configuration */
    _config: null,

    /** @type{String} the root directory from the config data, resolved as an absolute path */
    _rootDir: null,

    /**
     * @type {String}
     */
    _configFilename: null,

    /**
     * Loads configuration file, but will only do it once
     *
     * @return {Object} the configuration
     */
    async loadConfig() {
      if (this._config) {
        return this._config;
      }
      let loadedData = await this._loadConfigImpl();
      this._config = loadedData.config;
      this._rootDir = path.resolve(loadedData.baseDir, this._config.directory || "website");
      return this._config;
    },

    /**
     * @typedef {Object} LoadConfigImplResult
     * @property {Object} config the loaded JSON configuration
     * @property {String} baseDir the base directory used to resolve relative paths, typically
     *  the directory of the config file
     *
     * @returns {LoadConfigImplResult}
     */
    async _loadConfigImpl() {
      let filename = this._getConfigFilename();
      let config = await zx.utils.Json.loadJsonAsync(filename);
      console.log("Using config from " + path.resolve(filename));
      let localFilename = "local-" + filename;
      if (fs.existsSync(localFilename)) {
        console.log("Adding config from " + path.resolve(localFilename));
        let tmp = await zx.utils.Json.loadJsonAsync(localFilename);
        qx.lang.Object.mergeWith(config, tmp, true);
      }
      return {
        config: config,
        baseDir: path.dirname(path.resolve(filename))
      };
    },

    /**
     * @param {string} filename
     */
    setConfigFilename(filename) {
      if (qx.core.Environment.get("qx.debug")) {
        if (this._config) {
          throw new Error("Cannot change config filename after config has been loaded");
        }
      }
      this._configFilename = filename;
    },

    /**
     * Returns the filename to load (this exists to be overridden
     *
     * @returns {String}
     */
    _getConfigFilename() {
      return this._configFilename || "cms.json";
    },

    /**
     * Returns the configuration data
     *
     * @return {Object} the data
     */
    getConfigData() {
      return this._config;
    },

    /**
     * Returns the root directory
     */
    getRootDir() {
      return this._rootDir;
    },

    /**
     * Helper method to resolve a filename relative to the application directory
     */
    resolveApp(...args) {
      return path.resolve(path.join(...args));
    },

    /**
     * Helper method to resolve a filename relative to the data directory
     */
    resolveData(...args) {
      return path.resolve(path.join(this._config.directory || ".", ...args));
    },

    /**
     * Helper method to resolve a filename relative to the temporary directory
     */
    resolveTemp(...args) {
      let tempDir = this._config.tempDirectory || path.join(this._config.directory || ".", "temp");
      let filename = zx.utils.Path.cleanupPath(path.join(tempDir, ...args));
      let tempFile = path.resolve(path.join(tempDir, filename));
      return filename;
    }
  },

  statics: {
    /** @type {String} the resource root directory */
    RESOURCE_DIR: null,

    /** @type {Config} the instance */
    __instance: null,

    /**
     * Returns the current singleton instance
     *
     * @return {Config} the instance
     */
    getInstance() {
      if (!zx.server.Config.__instance) {
        let classname = qx.core.Environment.get("zx.server.Config.ConfigLoaderClass");
        let clazz = classname ? qx.Class.getByName(classname) : zx.server.Config;
        zx.server.Config.__instance = new clazz();
      }
      return zx.server.Config.__instance;
    },

    /**
     * Shortcut to getInstance().resolveApp
     *
     * @returns {String}
     */
    resolveApp(...args) {
      return this.getInstance().resolveApp(...args);
    },

    /**
     * Shortcut to getInstance().resolveData
     *
     * @returns {String}
     */
    resolveData(...args) {
      return this.getInstance().resolveData(...args);
    },

    /**
     * Shortcut to getInstance().resolveTemp
     *
     * @returns {String}
     */
    resolveTemp(...args) {
      return this.getInstance().resolveTemp(...args);
    },

    /**
     * Shortcut that gets a singleton instance and loads the config if necessary
     *
     * @returns {Object} the raw config data
     */
    async getConfig() {
      return await zx.server.Config.getInstance().loadConfig();
    }
  },

  defer(statics) {
    // The resource dir is always the same on Qooxdoo v6 with the Qx Compiler
    statics.RESOURCE_DIR = qx.util.LibraryManager.getInstance().get("qx", "resourceUri") + path.sep;
  }
});
