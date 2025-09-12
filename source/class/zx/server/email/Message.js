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

const fs = require("fs");
const path = require("path");

/**
 * 
db.getCollection("zx.server.email.Message").createIndex(
   {
      "to": "text",
      "htmlBody": "text"
   }
)
 * @typedef EmailParameters
 * @property {String} from the email address to send from, if supported
 * @property {String} to the email address to send to
 * @property {String[]} cc the email addresses to CC
 * @property {String[]} bcc the email addresses to BCC
 * @property {String} subject the subject of the email
 * @property {String} priority the priority of the email
 * @property {Array<{ name: string; path: string; } | zx.server.email.Attachment>} attachments the attachments to send
 */

/**
 * An email message that is queued for sending
 */
qx.Class.define("zx.server.email.Message", {
  extend: zx.server.Object,
  include: [zx.utils.MConsoleLog],
  implement: [zx.io.persistence.IObjectNotifications],

  properties: {
    /**
     * Name of the website that the email is being sent from
     * Set from zx.server.Standalone.getInstance().getWebsiteName()
     */
    websiteName: {
      "@": [zx.io.persistence.anno.Property.DEFAULT, zx.io.remote.anno.Property.PROTECTED],
      init: null,
      nullable: true,
      check: "String",
      event: "changeWebsiteName"
    },

    /**
     * Date when the email was put into the queue
     */
    dateQueued: {
      "@": [zx.io.persistence.anno.Property.DEFAULT, zx.io.remote.anno.Property.PROTECTED],
      init: null,
      nullable: true,
      check: "Date",
      event: "changeDateQueued"
    },

    /**
     * Date when the email was successfully delivered
     */
    dateDelivered: {
      "@": [zx.io.persistence.anno.Property.DEFAULT, zx.io.remote.anno.Property.PROTECTED],
      init: null,
      nullable: true,
      check: "Date",
      event: "changeDateDelivered"
    },

    /**
     * From email address
     */
    from: {
      "@": [zx.io.persistence.anno.Property.DEFAULT, zx.io.remote.anno.Property.PROTECTED],
      init: null,
      nullable: true,
      check: "String",
      event: "changeFrom"
    },

    /**
     * To email address(es)
     * @type {qx.data.Array<string>} read value
     */
    to: {
      "@": [zx.io.persistence.anno.Property.DEFAULT, zx.io.remote.anno.Property.PROTECTED],
      init: null,
      nullable: true,
      transform: "__ensureQxArray",
      check(value) {
        return this.__isStringArray(value);
      },
      event: "changeTo"
    },

    /**
     * CC email address(es)
     * @type {qx.data.Array<string>} read value
     */
    cc: {
      "@": [zx.io.persistence.anno.Property.DEFAULT, zx.io.remote.anno.Property.PROTECTED],
      init: null,
      nullable: true,
      transform: "__ensureQxArray",
      check(value) {
        return this.__isStringArray(value);
      },
      event: "changeCc"
    },

    /**
     * BCC email address(es)
     * @type {qx.data.Array<string>} read value
     */
    bcc: {
      "@": [zx.io.persistence.anno.Property.DEFAULT, zx.io.remote.anno.Property.PROTECTED],
      init: null,
      nullable: true,
      transform: "__ensureQxArray",
      check(value) {
        return this.__isStringArray(value);
      },
      event: "changeBcc"
    },

    /**
     * Email subject
     */
    subject: {
      "@": [zx.io.persistence.anno.Property.DEFAULT, zx.io.remote.anno.Property.PROTECTED],
      init: null,
      nullable: true,
      check: "String",
      event: "changeSubject"
    },

    /**
     * HTML body of the email
     */
    htmlBody: {
      "@": [zx.io.persistence.anno.Property.DEFAULT, zx.io.remote.anno.Property.PROTECTED],
      init: null,
      nullable: true,
      check: "String",
      event: "changeHtmlBody"
    },

    /**
     * Text body of the email
     */
    textBody: {
      "@": [zx.io.persistence.anno.Property.DEFAULT, zx.io.remote.anno.Property.PROTECTED],
      init: null,
      nullable: true,
      check: "String",
      event: "changeTextBody"
    },

    /**
     * Attachments for the email
     * @type {qx.data.Array<zx.server.email.Attachment>}
     */
    attachments: {
      "@": [zx.io.persistence.anno.Property.EMBED, zx.io.remote.anno.Property.PROTECTED],
      init: null,
      nullable: true,
      check: "qx.data.Array",
      event: "changeAttachments",
      transform: "__ensureQxArray"
    },

    /**
     * Last error message if the email was not sent
     */
    lastErrorMessage: {
      "@": [zx.io.persistence.anno.Property.DEFAULT, zx.io.remote.anno.Property.PROTECTED],
      init: null,
      nullable: true,
      check: "String",
      event: "changeLastErrorMessage"
    }
  },

  members: {
    /* PROPERTY CHECK/TRANSFORM */
    __isStringArray(value) {
      return value instanceof qx.data.Array && value.every(v => typeof v === "string");
    },

    __isAttachmentArray(value) {
      return value instanceof qx.data.Array && value.every(v => v instanceof zx.server.email.Attachment);
    },

    __ensureQxArray(value) {
      if (!Array.isArray(value) && !(value instanceof qx.data.Array) && value !== null) {
        value = [value];
      }
      if (Array.isArray(value)) {
        return new qx.data.Array(value);
      }
      return value;
    },

    /**
     * @Override
     */
    async receiveDataNotification(key, data) {
      await super.receiveDataNotification(key, data);
      if (key === zx.io.persistence.IObjectNotifications.BEFORE_WRITE_TO_JSON) {
        if (!this.getDateQueued()) {
          this.setDateQueued(new Date());
        }
        if (!this.getWebsiteName()) {
          this.setWebsiteName(zx.server.Standalone.getInstance().getWebsiteName());
        }
      }
    },

    /**
     * @returns {Promise<void>} A promise that resolves when the email has been sent or failed to send
     * @throws {Error} If the email cannot be sent
     */
    async sendEmail() {
      let htmlBody = this.getHtmlBody();

      let config = await zx.server.Config.getConfig();
      if (!config.smtpServer) {
        throw new Error("SMTP server configuration not found in cms.json");
      }

      /** @type {Array<Record<keyof any, any>>} */
      let attachmentsData = [{ data: htmlBody, alternative: true }];
      this.debug("Before getting attachments");
      if (this.getAttachments()) {
        let mime = (await import("mime")).default;
        this.getAttachments().forEach(attachment => {
          let filename = attachment.getPath();
          if (!fs.existsSync(filename)) {
            this.error(`Attachment ${filename} does not exist`);
            return;
          }
          let stream = fs.createReadStream(filename);
          let attachmentData = {};
          if (stream) {
            attachmentData.stream = stream;
          } else {
            attachmentData.path = filename;
          }

          if (attachment.getContentType()) {
            attachmentData.type = attachment.getContentType();
          } else {
            let fileExt = path.extname(filename);
            if (fileExt.startsWith(".")) {
              fileExt = fileExt.substring(1);
              let mimeType = mime.getType(fileExt);
              if (mimeType) {
                attachmentData.type = mimeType;
              }
            }
          }

          attachmentData.name = attachment.getName() || path.basename(filename);
          attachmentsData.push(attachmentData);
        });
      }

      this.debug("Before getting creating emailJsMessage");

      let emailConfig = {
        to: this.getTo(),
        cc: this.getCc(),
        bcc: this.getBcc(),
        subject: this.getSubject(),
        attachment: attachmentsData,
        text: this.getTextBody(),
        ...(this.getFrom() ? { "reply-to": this.getFrom() } : {})
      };
      if (config.smtpServer.fromAddr) {
        emailConfig.from = config.smtpServer.fromAddr;
      }
      let emailJsMessage = zx.server.email.EmailJS.createNewMessage(emailConfig);

      let client = zx.server.email.SMTPClient.getSmtpClientImpl();

      try {
        this.debug("Before sending message via emailJs");
        await client.sendAsync(emailJsMessage);
        this.setDateDelivered(new Date());
        await this.save();
        this.debug("After sending message via emailJs");
      } catch (err) {
        if (!(emailJsMessage instanceof zx.server.email.Message)) {
          let server = zx.server.Standalone.getInstance();
          emailJsMessage = await server.findOneObjectByType(zx.server.email.Message, { _uuid: this.toUuid() });
        }
        this.error(`Error sending email with UUID: ${this.toUuid()}. Stack: ${err?.stack ?? "(no stack trace)"}`);
        this.setLastErrorMessage(err ? err.message : "Unknown error when sending email");
        await this.save();
        throw err;
      }
    }
  }
});
