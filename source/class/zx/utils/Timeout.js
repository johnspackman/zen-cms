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

/**
 * Timeout class, with options to repeat and enable/disable
 */
qx.Class.define("zx.utils.Timeout", {
  extend: qx.core.Object,

  /**
   * Constructor
   *
   * @param {Integer} duration in milliseconds
   * @param {Function} callback default callback
   * @param {var} context for the callback
   */
  construct(duration, callback, context) {
    super();
    this.__onTimeoutBound = this._onTimeout.bind(this);
    if (duration) {
      this.setDuration(duration);
    }
    if (callback) {
      this.addListener("timeout", callback, context);
    }
    if (!zx.utils.Timeout.__allTimers) {
      zx.utils.Timeout.__allTimers = {};
    }
    zx.utils.Timeout.__allTimers[this.toHashCode()] = this;
  },

  /**
   * Destructor
   */
  destruct() {
    this.killTimer();
    delete zx.utils.Timeout.__allTimers[this.toHashCode()];
  },

  properties: {
    /** How long between firings, in milliseconds */
    duration: {
      init: 5000,
      nullable: false,
      check: "Integer",
      event: "changeDuration",
      apply: "_applyXxxx"
    },

    /** Whether this recurs */
    recurring: {
      init: false,
      nullable: false,
      check: "Boolean",
      apply: "_applyXxxx"
    },

    /** Whether the timeout is enabled */
    enabled: {
      init: true,
      check: "Boolean",
      apply: "_applyEnabled"
    },

    /** Callback for exceptions during timeout processing
     * @type {(ex: Error) => void}
     */
    exceptionCallback: {
      init: null,
      nullable: true,
      check: "Function"
    }
  },

  events: {
    /** Triggered when the timeout happens */
    timeout: "qx.event.type.Event",

    /** Triggered when the timeout delay is reset */
    reset: "qx.event.type.Event"
  },

  members: {
    /** @type{var} the `setTimeout` ID */
    __timerId: null,

    /** @type{Function} the callback for `setImeout`, bound to this */
    __onTimeoutBound: null,

    /**
     * Apply method for various properties
     */
    _applyXxxx() {
      if (this.__timerId) {
        this.resetTimer();
      }
    },

    /**
     * Apply for `enabled`
     */
    _applyEnabled(value) {
      if (value && !this.__timerId) {
        this.resetTimer();
      }
    },

    /**
     * Starts the timer
     */
    startTimer() {
      if (qx.core.Environment.get("qx.debug")) {
        if (this.isDisposed()) {
          throw new Error("Cannot start a timer that has been disposed");
        }
      }
      if (this.isEnabled()) {
        var dur = this.getDuration();
        if (this.__timerId === null && dur > 0) {
          this.__timerId = setTimeout(this.__onTimeoutBound, dur);
          this.fireEvent("reset");
        }
      }
    },

    /**
     * Kills the timer
     */
    killTimer() {
      if (this.__timerId) {
        clearTimeout(this.__timerId);
        this.__timerId = null;
      }
    },

    /**
     * Resets the timer
     */
    resetTimer() {
      this.killTimer();
      this.startTimer();
    },

    /**
     * Fires the timer
     */
    async fire() {
      await this.fireEventAsync("timeout");
    },

    /**
     * Triggers the timeout
     */
    async trigger() {
      this.killTimer();
      if (this.isEnabled()) {
        try {
          await this.fire();
        } catch (ex) {
          if (this.getExceptionCallback()) {
            this.getExceptionCallback().call(this, ex);
          } else {
            throw ex;
          }
        }
        if (this.isEnabled() && this.isRecurring() && !this.isDisposed()) {
          this.startTimer();
        }
      }
    },

    /**
     * Event handler for timeouts
     */
    async _onTimeout(evt) {
      this.trigger();
    }
  },

  statics: {
    /**
     * Sleeps for a duration, returning a promise that resolves when the sleep is done
     *
     * @param {Integer} duration time in ms to sleep for
     * @returns
     */
    async sleep(duration) {
      return new Promise(resolve => setTimeout(resolve, duration));
    }
  }
});
