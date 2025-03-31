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
      await pageApi.subscribe("pageReady", async data => {
        let {
          htmlBody,
          textBody,
          /**@type {EmailParameters}*/
          parameters
        } = data;
        parameters.to = parameters.to?.split(",") ?? [];
        parameters.cc = parameters.cc?.split(",") ?? [];
        parameters.bcc = parameters.bcc?.split(",") ?? [];
        log("Email body to send: " + htmlBody);
        log("Email parameters: " + JSON.stringify(parameters, null, 2));

        if (parameters.attachments) {
          const attachments = new qx.data.Array();
          for (let attachment of parameters.attachments) {
            if (attachment instanceof zx.server.email.Attachment) {
              attachments.push(attachment);
              continue;
            }
            attachments.push(
              new zx.server.email.Attachment().set({
                name: attachment.name,
                path: attachment.path
              })
            );
          }
          parameters.attachments = attachments;
        }

        // ensure all `undefined` values are replaced with `null`
        for (const key in parameters) {
          parameters[key] ??= null;
        }

        log("Composing email...");
        let message = new zx.server.email.Message().set({ ...parameters, htmlBody, textBody });
        await message.save();
        log("Email composed");
        messages.push(message);
        pageApi.next();
      });

      let promiseComplete = pageApi.whenNextSubscriptionFired("complete");
      await pageApi.start();
      await promiseComplete;

      await ctlr.close();
      ctlr.dispose();
      this.debug("Puppeteer client stopped");

      return "success!";
    },

    /**@override*/
    async abort(worker) {}
  }
});
