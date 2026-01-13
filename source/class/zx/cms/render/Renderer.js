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

const fs = zx.utils.Promisify.fs;

/**
 * Implements the rendering of objects for the middleware
 *
 */
qx.Class.define("zx.cms.render.Renderer", {
  extend: qx.core.Object,

  construct() {
    super();
    this.__views = [];
    new zx.cms.render.NunjucksController();
  },

  properties: {
    themeName: {
      check: "String",
      apply: "_applyThemeName"
    }
  },

  members: {
    /** {zx.cms.render.Theme} the theme */
    __theme: null,

    /** @type{Map<String,zx.cms.render.View} cached list of views, indexed by template has code */
    __views: null,

    /**
     * Gets a view for a template, caching the result
     *
     * @param {zx.cms.render.Template} template
     * @returns {zx.cms.render.View}
     */
    getView(template) {
      let hash = template.toHashCode();
      let view = this.__views[hash];
      if (!view) {
        view = this.__views[hash] = new zx.cms.render.NunjucksView(template);
      }
      return view;
    },

    /**
     * Renders an object to the response
     *
     * @param rendering {zx.cms.render.IRendering} the rendering transport
     * @param viewable {IViewable} the viewable object
     */
    async renderViewable(rendering, viewable) {
      let ctlr = zx.cms.render.Controller.getController(viewable);
      let templateName = ctlr.getTemplateName(viewable);
      let template = await zx.cms.render.Resolver.resolveTemplate(ctlr, this.getTheme(), templateName);
      if (!template) {
        throw new zx.utils.Http.HttpError(404, `Cannot find template called ${templateName} for ${viewable.classname} instance ${viewable}`);
      }

      /*
       * TODO this assumes that the template must be Nunjucks, but that is not necessarily the case in the future.
       * As Template is an object produced by the Controller it could have control over it's output
       */
      let view = this.getView(template);
      let server = zx.server.Standalone.getInstance();
      let site = server.getSite();

      let user = await rendering.getUser();
      let userAgent = rendering.getHeader("user-agent");
      let context = {
        parentContext: null,
        parent: null,
        zx: {
          _rendering: rendering,
          debug: !!qx.core.Environment.get("qx.debug"),
          websiteName: server.getWebsiteName(),
          hostName: rendering.getHostName(),
          user: {
            hasPermission: permname => {
              return user && user.hasPermission(permname);
            },
            username: user ? user.getUsername() : "",
            fullName: (user && user.getFullName()) || ""
          },

          site: {
            navigation: []
          },

          filehash: filename => server.getUrlFileHash(filename),
          browser: {
            name: qx.bom.client.Browser.detectName(userAgent).replace(/ /g, "-"),
            deviceType: qx.bom.client.Device.detectDeviceType(userAgent)
          }
        }
      };

      this._updateContext(rendering, context);

      function addNav(arr, navItem) {
        if (!navItem) {
          return;
        }
        let data = {
          url: navItem.getUrl(),
          title: navItem.getTitle() || "",
          cssClass: navItem.getCssClass() || "",
          children: []
        };

        arr.push(data);
        navItem.getChildren().forEach(child => addNav(data.children, child));
      }

      let children = site.getRootNavigation()?.getChildren();
      if (children) {
        children.forEach(child => addNav(context.zx.site.navigation, child));
      }

      await viewable.prepareContext(context, rendering);
      if (rendering.isStopped()) {
        return;
      }
      await view.render(rendering, viewable, context);
    },

    /**
     * Called to update the context, if necessary
     *
     * @param {*} context
     */
    _updateContext(rendering, context) {
      // Nothing
    },

    async renderPiece(context) {
      let templateName = context._templateName;
      let pos = templateName.indexOf(":");
      if (pos < 0) {
        throw new Error(`Badly formed template name ${templateName}`);
      }
      let pieceClassname = templateName.substring(0, pos);
      templateName = templateName.substring(pos + 1);
      let ctlr = zx.cms.render.Controller.getController(pieceClassname);

      let template = await zx.cms.render.Resolver.resolveTemplate(ctlr, this.getTheme(), templateName);
      if (!template) {
        throw new zx.utils.Http.HttpError(404, `Cannot find template called ${templateName} for ${pieceClassname}`);
      }

      let view = new zx.cms.render.NunjucksView(template);
      context = context || {};
      let rendering = new zx.cms.render.MemoryRendering();
      await view.render(rendering, null, context);
      return rendering.getBody();
    },

    /**
     * Renders a system page to the response
     *
     * @param rendering {zx.cms.render.IRendering} the rendering transport
     * @param name {String} the name of the system page eg "404.html"
     * @param context {Object?} the context object for rendering
     */
    async renderSystemPage(rendering, name, context) {
      let filename = await this.resolveSystemPage(name + ".html");
      if (!filename) {
        let statusCode = parseInt(name, 10);
        if (isNaN(statusCode) || statusCode != name) {
          statusCode = 0;
        }
        let message = context.message || JSON.stringify(context, null, 2);
        this.warn(`System Page: ${statusCode}: ${message}`);
        await rendering.setStatus(statusCode || 500);
        await rendering.send("Cannot find system page " + name + ".html; " + message);
      } else {
        let template = new zx.cms.render.FileTemplate(filename, null, name);
        let view = new zx.cms.render.NunjucksView(template);
        await view.render(rendering, null, context);
      }
    },

    /**
     * Locates a system page (eg 404.html)
     *
     * @param name {String} the name of the page
     * @return {String} the filename, throws an exception if nothing can be found
     */
    async resolveSystemPage(name) {
      let filename = zx.server.Config.getInstance().resolveApp("system-pages", name);
      if (await fs.existsAsync(filename)) {
        return filename;
      }

      filename = this.getTheme().resolve(name);
      if (filename != null) {
        return filename;
      }

      filename = zx.server.Config.RESOURCE_DIR + "zx/cms/system-pages/" + name;
      if (await fs.existsAsync(filename)) {
        return filename;
      }

      if (name != "404.html") {
        this.error(`Cannot find system page ${name}`);
        return this.resolveSystemPage("404.html");
      }

      throw new Error(`Cannot find any system pages when searching for ${name}`);
    },

    /**
     * Apply for themeName
     */
    _applyThemeName(value) {},

    /**
     * Returns the theme
     *
     * @return {zx.cms.render.Theme}
     */
    getTheme() {
      if (!this.__theme) {
        let themeName = this.getThemeName();
        let clazz = themeName ? qx.Class.getByName(themeName) : null;
        if (!clazz) {
          this.warn(`Cannot find a Javascript theme class named ${themeName} - this is normal unless you are writing a theme in code`);
          clazz = zx.cms.render.Theme;
        }
        this.__theme = new clazz(themeName);
        this.__theme.start();
        zx.cms.render.NunjucksController.getInstance().setTheme(this.__theme);
      }
      return this.__theme;
    }
  },

  statics: {
    /**
     * Creates a child context, used when iterating over (eg) pieces
     *
     * @param {Object} parentContext
     * @param {Object} parent
     * @returns
     */
    createContext(parentContext, parent) {
      let context = {
        parentContext: parentContext || null,
        parent: parent
      };

      if (parentContext) {
        let ancestor = parentContext;
        while (ancestor.parentContext) {
          ancestor = ancestor.parentContext;
        }
        context.zx = ancestor.zx;
        context.pageContext = ancestor;
      }
      return context;
    }
  }
});
