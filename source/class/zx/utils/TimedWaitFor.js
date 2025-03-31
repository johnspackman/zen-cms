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

/**
 * A class that waits for a certain amount of time before firing an event; the event can be
 * triggered manually.
 *
 * This is useful for when there are a number of things that need to happen, one of which is
 * a timeout, and you want to wait for any of those events to finish or a timeout before continuing.
 */
qx.Class.define("zx.utils.TimedWaitFor", {
  extend: qx.core.Object,

  /**
   * @param {Integer?} duration
   */
  construct(duration) {
    super();
    this.__firedPromise = new qx.Promise();
    if (duration) {
      this.setDuration(duration);
    }
  },

  properties: {
    /** How long between firings, in milliseconds */
    duration: {
      init: 5000,
      nullable: false,
      check: "Integer",
      event: "changeDuration",
      apply: "_applyDuration"
    }
  },

  members: {
    /** @type{Boolean} whether the event has been fired */
    __fired: false,

    /** @type{Promise} promise which resolves when the event has been fired */
    __firedPromise: null,

    /**
     * Apply for `duration` property
     */
    _applyDuration(value, old) {
      if (this.__fired) {
        this.warn("Cannot change duration after firing");
        return;
      }
      this.restartTimer();
    },

    /**
     * Restarts the timer, without firing the event
     */
    restartTimer() {
      if (this.__timerId) {
        clearTimeout(this.__timerId);
      }
      if (this.getDuration()) {
        this.__timerId = setTimeout(() => this.fire(), this.getDuration());
      }
    },

    /**
     * Fires the event and resolves the promise; this does nothing if the event has already been fired
     */
    fire() {
      if (!this.__fired) {
        this.__fired = true;
        this.__firedPromise.resolve();
        this.fireEvent("timeout");
      }
    },

    /**
     * Waits for the event to fire; the promise resolves immediately if the event has already fired
     */
    async wait() {
      return await this.__firedPromise;
    }
  }
});
