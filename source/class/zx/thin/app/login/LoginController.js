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

qx.Class.define("zx.thin.app.login.LoginController", {
  extend: qx.core.Object,

  construct() {
    super();
    if (zx.thin.app.login.LoginController.__instance) {
      throw new Error("Unexpected multiple copies of the login controller");
    }
    zx.thin.app.login.LoginController.__instance = this;
  },

  destruct() {
    if (zx.thin.app.login.LoginController.__instance === this) {
      zx.thin.app.login.LoginController.__instance = null;
    }
  },

  properties: {
    redirectTo: {
      init: "/",
      check: "String",
      event: "changeRedirectTo"
    }
  },

  objects: {
    loginForm() {
      let loginForm = new zx.thin.app.login.LoginForm();
      loginForm.addListener("login", this.__onLogin, this);
      return loginForm;
    }
  },

  members: {
    __loginApi: null,

    async getLoginApi() {
      if (this.__loginApi) {
        return this.__loginApi;
      }
      if (this.__loginApiPromise) {
        return await this.__loginApiPromise;
      }

      let controller = await qx.core.Init.getApplication().getNetController();
      this.__loginApiPromise = controller.getUriMappingAsync(zx.server.auth.LoginApi.classname);
      this.__loginApi = await this.__loginApiPromise;
      return this.__loginApi;
    },

    async __onLogin(evt) {
      let { email, password } = evt.getData();
      zx.thin.core.ScreenLock.getInstance().lock();
      let loginApi = await this.getLoginApi();
      let result = await loginApi.loginUser(email, password);
      zx.thin.core.ScreenLock.getInstance().unlock();
      if (!result || result.status == "failed") {
        await this.failed();
        return;
      }

      let loginForm = this.getQxObject("loginForm");
      if (result.status != "ok") {
        loginForm.reset("Invalid email or password");
        return;
      }

      if (result.appId) {
        window.location = "/zx/code/" + result.appId + "/index.html";
      } else if (result.appPath) {
        window.location = "" + result.appPath;
      } else {
        let redirectTo = this.getRedirectTo();
        if (!redirectTo) {
          redirectTo = "/";
        } else if (redirectTo == ".") {
          redirectTo = document.location.href;
        }
        window.location = redirectTo;
      }
    },

    async failed() {
      this.reset();
      await zx.thin.ui.utils.Alert.show("There has been a problem when logging you in - please email Technical Support for assistance");
    },

    reset() {
      let loginForm = this.getQxObject("loginForm");
      loginForm.reset();
      loginForm.show();
    }
  },

  statics: {
    /** @type{zx.thin.app.login.LoginController} Singleton instance */
    __instance: null,

    /**
     * Returns a global instance, creating one if necessary
     *
     * @returns
     */
    getInstance() {
      if (zx.thin.app.login.LoginController.__instance == null) {
        new zx.thin.app.login.LoginController();
      }
      return zx.thin.app.login.LoginController.__instance;
    }
  }
});
