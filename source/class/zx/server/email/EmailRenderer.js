/**
 * Used to render HTML emails in the browser and then send them
 */
qx.Class.define("zx.server.email.EmailRenderer", {
  statics: {
    /**
     * @param {zx.server.work.Worker} worker
     * @param {string} url  URL of the webpage with the email content
     * @param {object} clientConfig  Configuration for the instance of `zx.server.puppeteer.PuppeteerClient`
     * @returns {Promise<zx.server.email.Message[]>} Array of messages to send
     */
    async run(worker, url, clientConfig) {
      let messages = [];
      let config = grasshopper.services.ServicesConfig.getInstance().getConfigData();

      await zx.server.puppeteer.CapturePage.execute(worker, {
        url,
        clientConfig,
        async onPageReady({ data, ctlr }) {
          let {
            htmlBody,
            textBody,
            /**@type {EmailParameters}*/
            parameters
          } = data;
          let pageApi = ctlr.getClientApi(zx.server.puppeteer.api.IPageApi);

          parameters.to = parameters.to?.split(",") ?? [];
          parameters.cc = parameters.cc?.split(",") ?? [];
          parameters.bcc = parameters.bcc?.split(",") ?? [];
          worker.appendWorkLog("Email body to send: " + htmlBody);
          worker.appendWorkLog("Email parameters: " + JSON.stringify(parameters, null, 2));

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

          worker.appendWorkLog("Composing email...");
          let message = new zx.server.email.Message().set({ ...parameters, htmlBody, textBody });
          await message.save();
          worker.appendWorkLog("Email composed");
          messages.push(message);
        }
      });
      return messages;
    }
  }
});
