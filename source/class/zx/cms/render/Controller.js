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
 * @asset(templates/global/*)
 */
qx.Class.define("zx.cms.render.Controller", {
  extend: qx.core.Object,
  type: "abstract",

  construct(viewableClass) {
    super();
    this.__viewableClass = viewableClass;
  },

  members: {
    /** {qx.Class} the class that this controller manages */
    __viewableClass: null,

    /**
     * Returns the viewable class that this controller is for
     *
     * @return {qx.Class}
     */
    getViewableClass() {
      return this.__viewableClass;
    },

    /**
     * Gets the name of the view to use to render the viewable; this name will be offered first
     * to the Theme and then back to this controller again in `getView`
     *
     * @param viewable {IViewable} the viewable object
     * @return {String} the view name to use
     * @abstract
     */
    getTemplateName(viewable) {
      throw new Error("No such implementation for " + this.classname + ".getTemplateName");
    },

    /**
     * Returns a named template.  The default implementation looks in the resources for a file with
     * the name of the template plus ".html", first in a directory named after the viewable class and
     * then in a directory named after the controller class; directory names are class names, but the
     * "." is used to separate paths, eg "abc.def.MyClass" becomes "resource/abc/def/MyClass".
     *
     * @param name {String} the name of the template to get
     * @return {Template?}
     */
    async getTemplate(name) {
      const vcp = this.getViewableClass().classname.replace(/\./g, "/");
      const cp = this.classname.replace(/\./g, "/");
      let arrPaths;
      if (name == "index") {
        arrPaths = [vcp + ".html", vcp + "/index.html", cp + ".html", cp + "/index.html"];
      } else arrPaths = [vcp + "/" + name + ".html", cp + "/" + name + ".html"];
      for (var i = 0; i < arrPaths.length; i++) {
        let filename = zx.server.Config.RESOURCE_DIR + arrPaths[i];
        if (fs.existsSync(filename)) {
          return new zx.cms.render.FileTemplate(filename, this.getViewableClass().classname, name);
        }
      }

      return null;
    }
  },

  statics: {
    /** Controller instances indexed by class name */
    __controllers: {},

    /**
     * Gets a controller for an object, creating one if necessary.  By default the controller class will
     * have the same name as the object but with "Controller" appended, eg `Page` and `PageController`.
     *
     * If there isn't a direct, obvious choice (eg "MyPage" and a matching "MyPageController"), this mechanism
     * will walk up the class hierarchy until it finds a matching controller class.
     *
     * If you want a custom name or a specially configured instance, you can use `registerController`.
     * If a controller cannot be found, an exception is raised
     *
     * @param object {qx.core.Object|qx.Class|String} the object to find a controller for or the class of object
     * @return {Controller} a controller
     */
    getController(object) {
      let viewableClass;
      if (typeof object == "string") {
        viewableClass = qx.Class.getByName(object);
        if (!viewableClass) {
          throw new Error(`Cannot find a class called ${object}`);
        }
      } else if (object.constructor === object) {
        viewableClass = object;
      } else if (qx.Class.hasInterface(object.constructor, zx.cms.render.IViewable)) {
        viewableClass = object.constructor;
      } else {
        throw new Error(`Cannot locate a controller for ${object} because I can't understand what it is`);
      }

      let current = zx.cms.render.Controller.__controllers[viewableClass.classname];
      if (current) {
        return current;
      }

      let searchClass = viewableClass;
      while (searchClass !== qx.core.Object) {
        let controllerClass = qx.Class.getByName(searchClass.classname + "Controller");

        if (controllerClass) {
          current = zx.cms.render.Controller.__controllers[viewableClass.classname] = new controllerClass(viewableClass);
          return current;
        }
        searchClass = searchClass.superclass;
        qx.core.Assert.assertFalse(searchClass.classname === zx.cms.content.Page);
      }

      qx.core.Assert.assertFalse(true);
    },

    /**
     * Registers a controller instance to use for a given class; you only need to call this if your controller
     * class is named in a non standard way (ie is not the same as the object's class plus "Controller" appended)
     * or you need a specially configured instance.
     *
     * @param clazz {qx.Class} a class to register for
     * @param ctlr {Controller} the controller instance to be used
     */
    registerController(clazz, ctlr) {
      let current = zx.cms.render.Controller.__controllers[clazz.classname];
      if (current) {
        qx.log.Logger.warn(
          `There already exists an instance of Controller for ${clazz.classname}, which is an instance of ${current.classname}; this is being overwritten with an instance of ${ctlr.classname}`
        );
      }
      current = zx.cms.render.Controller.__controllers[clazz.classname] = ctlr;
      return current;
    }
  }
});
