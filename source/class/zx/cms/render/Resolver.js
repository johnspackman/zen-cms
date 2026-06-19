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

/**
 * Locates templates based on template name and the place in the hierarchy.
 *
 * When resolving a template name, we generally follow the principal that given a viewable's
 * class name plus a template name, it is predictable which template will be located.  That is to
 * say, that `mypackage.MyClass:somelayout.html` is always the same and does not vary based on
 * scope of other transient contexts.  This is essential for compilation and caching in Nunjucks.
 *
 * However, bearing that in mind, there is still a heirachy of search orders, and it varies
 * depending on what you're trying to find a template for.
 *
 * Every website can have it's own templates directory in which it can override templates for
 * specific class:layout; themes can do the same (but website takes precedence); failing that the
 * controller for the class is asked.
 *
 * Once the search for layouts for a class name has been exhausted, the search switches to the global
 * context; this does mean that there is room for conflicting names to produce unexpected results without
 * warning - for example, a misspelt template for a class could result in a global template being produced
 * and there is little chance of catching that without human inspiration.
 *
 * However on a practical level, "extend"-ing or "include"-ing a file tends to work intuitively (provided
 * name collisions are avoided).
 *
 * Note that this approach means that the current directory has no special meaning - and this is
 * important if class:name is to be deterministic.
 */
qx.Class.define("zx.cms.render.Resolver", {
  extend: qx.core.Object,

  statics: {
    /**
     * Locates a template
     *
     * @param ctlr {Controller?} the controller for the viewable, null if a global template is required
     * @param theme {Theme} the theme to ask
     * @param name {String} the name of the template to get
     * @return {Template} the template, null if not found
     */
    async resolveTemplate(ctlr, theme, name) {
      const isIndex = name == "index";

      let classname = null;
      const findTemplate = (...args) => {
        let filename = path.join(...args);
        if (fs.existsSync(filename)) {
          return new zx.cms.render.FileTemplate(filename, classname, name);
        }
        return null;
      };

      let template = null;

      // If at the viewable level
      if (ctlr) {
        classname = ctlr.getViewableClass().classname;
        let vcp = ctlr.getViewableClass().classname;

        let webdataTemplatesDir = zx.server.Config.getInstance().resolveData("_cms/templates");

        template = findTemplate(webdataTemplatesDir, vcp, name + ".html");
        if (!template && isIndex) {
          template = findTemplate(webdataTemplatesDir, vcp + ".html");
        }

        // Ask theme for Viewable's Template
        //  Looks in `Website/website/themes/<Theme>` and in resources under `<Theme>`
        if (!template) {
          template = await theme.getTemplate(ctlr, name);
        }

        // Ask Controller for Viewable’s Template
        if (!template) {
          template = await ctlr.getTemplate(name);
        }

        if (template) {
          return template;
        }
      }

      // If at the global level
      classname = null;

      /*
       * If we cannot find something specific to the classname, then we can look in the
       * global templates; note that the Theme will have already checked it's global
       * templates.
       *
       * But we don't bother if the name is "index", because that's just a way of saying
       * "give me the default template for class 'X'"
       */
      if (!isIndex) {
        // Ask Local for Template
        //  Looks in Website/_cms/templates/global
        if (!template) {
          let webdataGlobalsDir = zx.server.Config.getInstance().resolveData("_cms/templates/globals");
          template = findTemplate(webdataGlobalsDir, name + ".html");
        }
      }

      if (!template) {
        qx.log.Logger.error(`Cannot find a view for ${ctlr ? ctlr.getViewableClass().classname : "(no controller)"} called ${name} because there is no such file`);
      }
      return template;
    }
  }
});
