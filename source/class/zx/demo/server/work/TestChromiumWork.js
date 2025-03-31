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
 *    Patryk Malinowski (@p9malino26)
 *
 * ************************************************************************ */

qx.Class.define("zx.demo.server.work.TestChromiumWork", {
  implement: zx.server.work.IWork,
  extend: qx.core.Object,

  members: {
    /**
     * @override
     */
    async execute(worker) {
      console.log("the chromium task is running!");
      let chromium = await worker.getChromium();

      let puppeteer = new zx.server.puppeteer.PuppeteerClient().set({
        url: "http://www.google.co.uk",
        debugOnStartup: false,
        chromiumEndpoint: chromium.getEndpoint()
      });
      puppeteer.addListener("log", evt => {
        worker.appendWorkLog(evt.getData());
        evt.preventDefault();
      });
      puppeteer.addListener("ping", evt => this.debug("ping"));

      this.debug("Puppeteer client created");

      try {
        // This can throw an exception if the URL is refused or other reasons
        await puppeteer.start();
        this.debug("Puppeteer client started");
      } catch (ex) {
        try {
          await puppeteer.stop();
          puppeteer.dispose();
        } catch (ex2) {
          this.error("Exception in closeDown after exception: " + (ex2.stack || ex2));
        }
        throw ex;
      }

      puppeteer.addListenerOnce("close", () => this.debug("Puppeteer client closed"));

      let filename = worker.resolveFile("demodata/www.google.co.uk.pdf");
      this.debug("Printing PDF to " + filename);
      await puppeteer.printToPdf(filename);
      this.debug("PDF printed");

      await puppeteer.stop();
      puppeteer.dispose();
      this.debug("Puppeteer client stopped");

      return "success!";
    },

    /**@override*/
    async abort(worker) {}
  }
});
