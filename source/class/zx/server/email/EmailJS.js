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

const fs = require("fs").promises;

/**
 * Used for managing the emailJs library
 * https://github.com/eleith/emailjs
 */
qx.Class.define("zx.server.email.EmailJS", {
  statics: {
    /** @type {emailjs} emailjs library */
    __emailJs: null,

    /** @type {emailjs.SMTPClient} */
    __smtpClientImpl: null,

    /** @type {Object} Zen CMS server config */
    __config: null,

    /**
     * Initialises the emailJs library so that it can be fetched synchronously using getEmailJs
     */
    async initialise() {
      this.__emailJs = await import("emailjs");
      this.__config = await zx.server.Config.getConfig();
      let config = this.__config;

      const emailJs = zx.server.email.EmailJS.getEmailJs();
      const { SMTPClient } = emailJs;

      if (!config.smtpServer) {
        qx.log.Logger.error("No smtpServer configuration found in the cms config file - email sending will not work");
        return;
      }

      let username = config.smtpServer.username;
      let password = config.smtpServer.password;

      this.__smtpClientImpl = new SMTPClient({
        user: username,
        password: password,
        host: config.smtpServer.host,
        port: config.smtpServer.port ?? undefined,
        ssl: config.smtpServer.ssl ?? false,
        tls: config.smtpServer.tls ?? false,
        timeout: config.smtpServer.timeout ?? undefined
      });
    },

    /**
     * @param {Partial<emailjs.MessageHeaders>} headers
     * @returns {emailjs.Message}
     */
    createNewMessage(headers) {
      const getValidatedAddresses = addrs => {
        if (!addrs) {
          return [];
        }
        if (typeof addrs === "string") {
          addrs = addrs.split(",").map(s => s.trim());
        }
        if (addrs instanceof qx.data.Array) {
          addrs = addrs.toArray();
        }
        if (!Array.isArray(addrs)) {
          addrs = [addrs];
        }
        return addrs.filter(addr => {
          let match = zx.utils.Email.validate(addr);
          if (!match) {
            qx.log.Logger.warn(`An address was found that does not look like an email address and will be ignored: '${addr}'`);
          }
          return match;
        });
      };

      headers.to = getValidatedAddresses(headers.to);
      headers.cc = getValidatedAddresses(headers.cc);
      headers.bcc = getValidatedAddresses(headers.bcc);

      let config = this.__config;
      if (config.smtpServer.toAddressOverride) {
        let htmlAttachment = null;
        if (headers.attachment) {
          htmlAttachment = headers.attachment.find(att => att.alternative);
          if (htmlAttachment) {
            let html = "";
            html += "<h2>ORIGINAL HEADERS:</h2><ul>";
            html += `<li><strong>to:</strong> ${headers.to.map(i => `${i}`).join(", ")}</li>`;
            html += `<li><strong>cc:</strong> ${headers.cc.map(i => `${i}`).join(", ")}</li>`;
            html += `<li><strong>bcc:</strong> ${headers.bcc.map(i => `${i}`).join(", ")}</li>`;
            html += "</ul><hr>" + htmlAttachment.data;
            htmlAttachment.data = html;
          }
        }
        if (headers.text || !htmlAttachment) {
          let text = "";
          text += "ORIGINAL HEADERS:\n\n";
          text += `\tto: ${headers.to.map(i => `<${i}>`).join(", ")}\n`;
          text += `\tcc: ${headers.cc.map(i => `<${i}>`).join(", ")}\n`;
          text += `\tbcc: ${headers.bcc.map(i => `<${i}>`).join(", ")}\n`;
          if (headers.text) {
            text += "\n\n" + headers.text;
          }
          headers.text = text;
        }
        headers.to = config.smtpServer.toAddressOverride;
        headers.cc = [];
        headers.bcc = [];
      } else if (qx.core.Environment.get("qx.debug")) {
        qx.log.Logger.warn(
          "Running in development environment without setting a toAddressOverride - the following email addresses will be sent the email:" +
            `\tto: ${headers.to.map(i => `<${i}>`).join(", ") || "(no to address(es))"}\n` +
            `\tcc: ${headers.cc.map(i => `<${i}>`).join(", ") || "(no cc address(es))"}\n` +
            `\tbcc: ${headers.bcc.map(i => `<${i}>`).join(", ") || "(no bcc address(es))"}\n`
        );
        debugger; //! do not remove - this debugger may prevent accidental sending of emails to real addresses during development
      }

      let Message = this.__emailJs.Message;
      return new Message(headers);
    },

    /**
     * Returns the emailjs library, which must have been initialized first by calling initialise()
     * @return {emailjs}
     */
    getEmailJs() {
      if (!this.__emailJs) {
        throw new Error("EmailJS not initialized");
      }
      return this.__emailJs;
    },

    /**@returns {emailjs.SMTPClient} */
    getSmtpClientImpl() {
      if (!this.__smtpClientImpl) {
        throw new Error("SMTPClient not initialized");
      }
      return this.__smtpClientImpl;
    }
  }
});
