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

const os = require("os");

/**
 * This class is used to send alerts via email to the server administrator.
 * It is useful for things like alerting the admin of any errors in the server that need attention.
 *
 * It debounces the emails such that an alert email is only sent every 5 minutes or less,
 * hence an email may have more than one alert.
 */
qx.Class.define("zx.server.email.AlertEmail", {
  type: "singleton",
  extend: qx.core.Object,

  construct() {
    super();
  },

  members: {
    /** @type {String[]} array of alerts to be sent */
    __queue: [],

    /** @type {Integer} timer id, queue will be cleared at timeout */
    __timerId: null,

    /** @type {Integer} The number of alerts queued to be emailed */
    __numAlerts: 0,

    /**
     * Adds an alert to send to the alerts email
     * @param {string} title Title of the alert
     * @param {string} text Full text or message of the alert
     */
    alert(title, text) {
      let config = zx.server.Config.getInstance().getConfigData();
      if (!config.alertsEmail) {
        this.warn("Alerts email not set, cannot send alert email with title: " + title);
        return;
      }

      this.__queue.push("\n\n============== ALERT: " + title + " ==============\n" + text);
      let maxAlerts = config.maxAlerts || 100;

      if (this.__queue.length > maxAlerts) {
        this.warn(`Number of alerts (${this.__queue.length}) has reached the maximum (${maxAlerts}), sending email immediately`);
        let body = this.__queue.join("\n");
        this.__queue = [];
        this.__cancelTimer();
        this.__sendEmail(body);
      } else {
        this.__startTimer();
      }
    },

    /**
     * Starts the timer to send the email, if it is not already started
     */
    __startTimer() {
      if (!this.__timerId) {
        const MINUTE = 60 * 1000;
        const INTERVAL_MS = zx.server.email.AlertEmail.INTERVAL_MINUTES * MINUTE;

        this.__timerId = setTimeout(() => {
          this.__timerId = null;
          let queue = this.__queue;
          this.__queue = [];
          if (queue.length) {
            let body = queue.join("\n");
            this.__sendEmail(body);
          }
        }, INTERVAL_MS);
      }
    },

    /**
     * Cancels the timer to send the email, if it is started.  The queue will not be cleared, so an email will still be sent
     * at the next timeout, or when the timer is started again.
     */
    __cancelTimer() {
      if (this.__timerId) {
        clearTimeout(this.__timerId);
        this.__timerId = null;
      }
    },

    /**
     * Sends the emails with alerts
     */
    async __sendEmail(body) {
      let client = zx.server.email.EmailJS.getSmtpClientImpl();
      let config = zx.server.Config.getInstance().getConfigData();
      if (config.alertsNoSend) {
        this.info("alertsNoSend is set, not sending alert email with body:\n" + body);
        return;
      }
      let message = zx.server.email.EmailJS.createNewMessage({
        from: config.smtpServer.fromAddr,
        to: config.alertsEmail,
        subject: `CRITICAL LOG ALERT for ${config.websiteName}, machine: ${os.hostname()}`,
        text: body
      });

      try {
        await client.sendAsync(message);
      } catch (err) {
        this.error("Error sending alert email: " + err.message + "\n" + err.stack);
      }
    }
  },

  statics: {
    /**
     * Every how many minutes minimum to send an alert email
     */
    INTERVAL_MINUTES: 1
  }
});
