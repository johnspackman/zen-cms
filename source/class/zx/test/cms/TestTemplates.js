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
const mkpath = zx.utils.Promisify.promisify(require("mkpath"));

/**
 * @use(zx.test.cms.CmsTestTheme)
 */
qx.Class.define("zx.test.cms.TestTemplates", {
  extend: qx.dev.unit.TestCase,

  members: {
    testParsing() {
      const doTest = async () => {
        const NC = zx.cms.render.NunjucksController;
        this.assertEquals(`abc\n{% extends "one.html?a=1" %}\ndef`, NC.parseTemplate(`abc\n{% extends "one.html" %}\ndef`, { a: 1 }));

        this.assertEquals(`abc\n{%\n\t\textends "one.html?a=1" %}\ndef`, NC.parseTemplate(`abc\n{%\n\t\textends "one.html" %}\ndef`, { a: 1 }));

        this.assertEquals(`abc\n{%extends "one.html?a=1"%}\ndef`, NC.parseTemplate(`abc\n{%extends "one.html"%}\ndef`, { a: 1 }));

        this.assertEquals(`abc\n{%blah "one.html"%}\ndef`, NC.parseTemplate(`abc\n{%blah "one.html"%}\ndef`, { a: 1 }));
      };
      doTest().then(() => this.resume());
      this.wait();
    },

    testResolver() {
      const doTest = async () => {
        let config = new zx.server.Config();
        await config.loadConfig("test/test-templates/cms.json");

        let ctlr = zx.cms.render.Controller.getController(zx.test.content.DemoPage);

        let theme = new zx.test.cms.CmsTestTheme();
        let template = await zx.cms.render.Resolver.resolveTemplate(ctlr, theme, "a");

        this.assertTrue(!!template);

        let nc = new zx.cms.render.NunjucksController(theme);
        let result = await nc.render(template, {});
        result = result
          .split("\n")
          .filter(s => !!s.trim().length)
          .join("\n");
        this.assertEquals(
          `local-theme-viewable-a
resources-viewable-b
local-theme-viewable-c
resources-theme-viewable-d
resources-theme-viewable-e`,
          result
        );

        nc.dispose();
        config.dispose();
      };
      doTest().then(() => this.resume());
      this.wait();
    }
  }
});
