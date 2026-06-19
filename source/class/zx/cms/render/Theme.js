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

const fs = require("fs");
const path = require("path");
const chokidar = require("chokidar");
const glob = require("glob").sync;

/**
 * All themes derived from Theme
 *
 * @asset(zx/thin/theme/materials/*)
 */
qx.Class.define("zx.cms.render.Theme", {
  extend: qx.core.Object,

  construct(themeName) {
    super();
    if (!themeName) {
      themeName = this.classname;
    }
    this.__themeName = themeName;
    this.__localDir = zx.server.Config.getInstance().resolveApp(path.join("website/themes", themeName));
    this.__resourceDir = path.join(zx.server.Config.RESOURCE_DIR, themeName.split(".").join("/"));
  },

  members: {
    __themeName: null,

    /** {String} The compiled theme files */
    __resourceDir: null,

    /** {String} The local website's theme file overrides */
    __localDir: null,

    /**
     * Called to try and get a template for a particular class of object; this is an
     * opportunity for a Theme to unilaterally override a template for any type of
     * object.
     *
     * The `ctlr` will be null when a global template is required.
     *
     * @param ctlr {Controller} the controller for the viewable object
     * @param name {String} the name of the template to get
     * @return {Template?}
     */
    async getTemplate(ctlr, name) {
      let arrPaths = [];
      const isIndex = name == "index";

      let filename = null;
      if (ctlr) {
        let vcp = ctlr.getViewableClass().classname;

        arrPaths.push(path.join(this.__localDir, vcp, name + ".html"));
        if (isIndex) {
          arrPaths.push(path.join(this.__localDir, vcp + ".html"));
        }

        arrPaths.push(path.join(this.__resourceDir, vcp, name + ".html"));
        if (isIndex) {
          arrPaths.push(path.join(this.__resourceDir, vcp + ".html"));
        }
      }

      if (!isIndex) {
        arrPaths.push(path.join(this.__localDir, "global", name + ".html"));
        arrPaths.push(path.join(this.__resourceDir, "global", name + ".html"));
      }

      for (let i = 0; i < arrPaths.length; i++) {
        if (fs.existsSync(arrPaths[i])) {
          return new zx.cms.render.FileTemplate(arrPaths[i], ctlr.getViewableClass().classname, name);
        }
      }

      return null;
    },

    /**
     * Attempts to locate a file, checking in the local and then resource directories
     *
     * @param filename {String} the filename
     * @return {String?} the name of the file if it exists, otherwise null
     */
    async resolve(filename) {
      let tmp = path.join(this.__localDir, filename);
      if (fs.existsSync(tmp)) {
        return tmp;
      }
      tmp = path.join(this.__resourceDir, filename);
      if (fs.existsSync(tmp)) {
        return tmp;
      }
      return null;
    },

    /**
     * Attempts to locate a file, checking in the local and then resource directories
     *
     * @param filename {String} the filename
     * @return {String?} the name of the file if it exists, otherwise null
     */
    resolveSync(filename) {
      let tmp = path.join(this.__localDir, filename);
      if (fs.existsSync(tmp)) {
        return tmp;
      }
      tmp = path.join(this.__resourceDir, filename);
      if (fs.existsSync(tmp)) {
        return tmp;
      }
      return null;
    },

    /**
     * Fastify middleware so that theme files can be served
     *
     * @param {import("fastify").FastifyRequest} req
     * @param {import("fastify").FastifyReply} reply
     */
    async middleware(req, reply) {
      let url = req.url;
      if (qx.core.Environment.get("qx.debug")) {
        if (!url.startsWith("/zx/theme")) {
          throw new Error("Unexpected mount point for theme, url is " + url);
        }
      }
      url = url.substring("/zx/theme".length);
      let pos = url.indexOf("?");
      if (pos > -1) {
        url = url.substring(0, pos);
      }
      let filename = path.resolve(path.join(this.__localDir, url));
      if (!filename.startsWith(this.__localDir) || !fs.existsSync(filename)) {
        filename = path.resolve(path.join(this.__resourceDir, url));

        if (!filename.startsWith(this.__resourceDir) || !fs.existsSync(filename)) {
          throw new zx.utils.Http.HttpError(404, `Cannot find theme file ${url}`);
        }
      }

      if (typeof reply.sendFile == "function") {
        return await reply.sendFile(path.basename(filename), path.dirname(filename));
      }
      return await reply.sendFileAbsolute(filename);
    },

    /**
     * Starts watching for resources and compiling them
     */
    async start() {
      let localDir = await zx.utils.Path.correctCase(this.__localDir);
      let resourceDir = await zx.utils.Path.correctCase(this.__resourceDir);
      let watcher = (this._watcher = chokidar.watch([localDir, resourceDir], {
        //ignored: /(^|[\/\\])\../
      }));
      let watcherReady = false;
      watcher.on("change", filename => onFileChange("change", filename));
      watcher.on("add", filename => onFileChange("add", filename));
      watcher.on("unlink", filename => onFileChange("unlink", filename));
      watcher.on("ready", () => {
        watcherReady = true;
        queueRebuildAllSass();
      });
      watcher.on("error", err => {
        if (err.code == "ENOSPC") {
          this.error("ENOSPC error occured - try increasing fs.inotify.max_user_watches");
          return;
        }
        this.error(`Error occured while watching files - file modifications may not be detected; error: ${err}`);
      });

      const onFileChange = (type, filename) => {
        if (filename.match(/\.scss$/i)) {
          if (path.basename(filename)[0] == "_") {
            queueRebuildAllSass();
          } else {
            queueRebuildSass(filename);
          }
        }
      };

      let timerId = null;
      let inTimer = false;
      let requeue = false;
      let rebuildAll = false;
      let rebuildSass = {};
      let dependentFiles = {};

      const queueRebuildAllSass = () => {
        rebuildAll = true;
        rebuildSass = {};
        queue();
      };

      const queueRebuildSass = filename => {
        if (!rebuildAll) {
          filename = path.resolve(filename);
          rebuildSass[filename] = true;
        }
        queue();
      };

      const onTimeout = async () => {
        inTimer = true;
        try {
          let sassFiles = [];
          if (rebuildAll) {
            rebuildAll = false;
            rebuildSass = {};
            sassFiles = glob(path.join(this.__localDir, "**.scss"));
            sassFiles = sassFiles.filter(filename => path.basename(filename)[0] != "_");
          } else {
            sassFiles = Object.keys(rebuildSass);
            rebuildSass = {};
          }

          for (let i = 0; i < sassFiles.length; i++) {
            let srcFilename = sassFiles[i];
            let info = path.parse(srcFilename);
            let outFilename = path.join(info.dir, info.name + ".css");
            let scssFile = new zx.cms.util.ScssFile(this, srcFilename);
            await scssFile.compile(outFilename);
            for (let i = 0, files = scssFile.getSourceFilenames(); i < files.length; i++) {
              let sourceFile = files[i];
              sourceFile = await zx.utils.Path.correctCase(sourceFile);
              if (sourceFile.startsWith(localDir) || sourceFile.startsWith(resourceDir)) {
                return;
              }
              if (!dependentFiles[sourceFile]) {
                dependentFiles[sourceFile] = true;
                watcher.add(sourceFile);
              }
            }
          }
        } finally {
          timerId = null;
          inTimer = false;
        }

        if (requeue) {
          requeue = false;
          queue();
        }
      };

      const queue = () => {
        if (inTimer) {
          requeue = true;
          return;
        }
        if (timerId) {
          clearTimeout(timerId);
        }
        timerId = setTimeout(onTimeout, 200);
      };

      const clearQueue = () => {
        if (timerId) {
          clearTimeout(timerId);
          timerId = null;
        }
        requeue = false;
      };
    },

    getLocalDir() {
      return this.__localDir;
    },

    getResourceDir() {
      return this.__localDir;
    }
  }
});
