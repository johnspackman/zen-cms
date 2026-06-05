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

qx.Class.define("zx.thin.app.login.LoginForm", {
  extend: zx.thin.ui.container.Window,

  "@": new zx.cms.content.anno.Feature().set({
    featureClass: zx.cms.app.auth.LoginFormFeature.classname
  }),

  construct() {
    super();
    this.setCaption("Login");
    let body = this.getBody();
    body.add(this.getQxObject("form"));
    body.add(
      <div class="content">
        <p>
          <a href="#" class="loginDlg-forgot-password">
            Click here if you have <b>forgotten your password</b>
          </a>
        </p>
      </div>
    );

    this.setCentered("both");
    this.setStyle("max-width", "600px");
  },

  properties: {
    inline: {
      refine: true,
      init: true
    }
  },

  events: {
    login: "qx.event.type.Data"
  },

  objects: {
    form() {
      let form = <form method="post" action="#"></form>;
      form.add(this.getQxObject("edtEmail"));
      form.add(this.getQxObject("edtPassword"));
      form.add(this.getQxObject("btnLogin"));
      form.addListener("submit", evt => evt.preventDefault());
      return form;
    },

    edtEmail() {
      return new zx.thin.ui.form.TextField().set({
        label: "Email Address",
        autoCompleteName: "email"
      });
    },

    edtPassword() {
      return new zx.thin.ui.form.TextField().set({
        label: "Password",
        autoCompleteName: "password",
        password: true
      });
    },

    btnLogin() {
      var btn = new zx.thin.ui.form.Button("Login").set({
        loadingStyle: "ball-clip-rotate-multiple"
      });

      btn.addListener("execute", async evt => {
        let email = this.getQxObject("edtEmail").getValue();
        let password = this.getQxObject("edtPassword").getValue();
        btn.setLoading(true);
        this.fireDataEvent("login", { email, password });
      });
      return btn;
    }
  },

  members: {
    setErrorText(message) {
      this.getQxObject("edtPassword").setErrorText(message);
    },

    getEmail() {
      return this.getQxObject("edtEmail").getValue();
    },

    getPassword() {
      return this.getQxObject("edtPassword").getValue();
    },

    /**
     * Resets the form
     *
     * @param errorMessage {String?} the message, if there is one
     */
    reset(errorMessage) {
      this.getQxObject("btnLogin").setLoading(false);
      this.setErrorText(errorMessage || null);
    },

    /*
     * @Override
     */
    _applyVisible(value, oldValue) {
      super._applyVisible(value, oldValue);
      if (!value) {
        this.reset();
      }
    }
  }
});
