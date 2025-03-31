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

qx.Class.define("zx.server.puppeteer.PrintPdfWork", {
  extend: qx.core.Object,
  implement: zx.server.work.IWork,

  members: {
    /**
     * @override
     */
    async execute(worker) {
      let json = worker.getWorkJson();
      if (!json.filename) {
        throw new Error("No filename specified");
      }

      let ctlr = new zx.server.puppeteer.PuppeteerWorkController(worker, [zx.server.puppeteer.api.IPageApi]);
      await ctlr.open();
      let pageApi = ctlr.getClientApi(zx.server.puppeteer.api.IPageApi);
      await pageApi.start();

      let filename = worker.resolveFile(json.filename);
      this.debug("Saving PDF to " + filename);
      await ctlr.getPuppeteer().printToPdf(filename);
      this.debug("PDF saved");

      await ctlr.close();
      ctlr.dispose();
      this.debug("Puppeteer client stopped");

      return "success!";
    },

    /**@override*/
    async abort(worker) {}
  }
});
