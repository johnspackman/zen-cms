/**
 * This class is used to cache return values of synchronous or asynchronous functions,
 * indxed by their input argument.
 * The generator function must take in a single arguments which is a string,
 * and return a value or a promise that resolves to a value.
 *
 * Optionally, the cache can expire after a certain time.
 *
 * @callback Generator The generator function which we will run and then cache the result of.
 * @param {String} input The input argument to the generator function
 * @returns {Promise<OutputData> | OutputData} The return value of the generator function, which can be a promise or a direct value
 *
 * @template OutputData Type of the return value of the generator function
 *
 * @typedef {Object} ValueData
 * @property {Promise<OutputData>?} promise If set, it means that we are currently computing the value
 * @property {OutputData?} value The computed value, if available
 * @property {number} lastActive The timestamp when the value was created/kicked. If the generator returnes a promise,
 *  this is initially set to the time when the promise was resolved, not when the generator was initially called.
 *
 */
qx.Class.define("zx.utils.FunctionResultCache", {
  extend: qx.core.Object,
  /**
   *
   * @param {Generator?} generator
   */
  construct(generator) {
    super();
    if (generator) {
      this.setGenerator(generator);
    }
    this.__cleanupTimer = new zx.utils.Timeout(0, () => this.__cleanupExpiredValues()).set({ enabled: false, recurring: true });
    this.bind("cleanupInterval", this.__cleanupTimer, "duration");
  },
  properties: {
    /**
     * The generator function that will be called to compute the value
     * @type {Generator}
     */
    generator: {
      check: "Function",
      nullable: false,
      event: "changeGenerator"
    },
    /**
     * If non-zero, the cache will expire after this many milliseconds.
     */
    expiryTime: {
      check: "Number",
      init: 0, // Default to no expiry
      nullable: false,
      event: "changeExpiryTime",
      apply: "__updateCleanupTimer"
    },
    /**
     * How often to check for expired values in the cache.
     * Only used if expiryTime is non-zero.
     */
    cleanupInterval: {
      check: "Number",
      init: 10000, // Default to 10 seconds
      nullable: false,
      event: "changeCleanupInterval"
    }
  },
  members: {
    /**
     * @type {Map<String, ValueData>}
     * We have to use a Map for this and not a POJO because otherwise we would only be limited to string-y keys.
     */
    __cache: new Map(),

    /**
     * @type {zx.utils.Timeout}
     */
    __cleanupTimer: null,

    /**
     * Get the value for the given input, computing it if necessary.
     * If the value is being computed, it will return a promise that resolves to the value.
     *
     * @param {String} input
     * @return {Promise<OutputData> | OutputData}
     */
    get(input) {
      let cache = this.__cache;
      let generator = this.getGenerator();

      if (!cache.has(input)) {
        let record = {};
        this.__cache.set(input, record);

        /**
         *
         * @param {OutputData} value
         * @returns {OutputData}
         */
        const onReady = value => {
          record.value = value;
          delete record.promise;
          record.lastActive = Date.now();
          this.__updateCleanupTimer();
          return value;
        };

        let out = generator(input);
        if (qx.Promise.isPromise(out)) {
          record.promise = out.then(onReady).catch(e => {
            this.__cache.delete(input); // Remove from cache if promise rejected
            throw e;
          });
          return record.promise;
        } else {
          return onReady(out);
        }
      } else {
        let record = this.__cache.get(input);
        if (record.value !== undefined) {
          return record.value;
        }
        return record.promise;
      }
    },

    /**
     * Resets the expiry timeout of a value given an input key.
     * This is useful to keep the entry alive if it is still in use.
     * @param {String} input
     */
    keepAlive(input) {
      let record = this.__cache.get(input);
      if (record) {
        record.lastActive = Date.now();
      } else {
        this.warn(`Attempting to kick a non-existing cache entry for input: ${input}`);
      }
    },

    /**
     * Removes the cache entry for the given input.
     * @param {String} input
     */
    remove(input) {
      let record = this.__cache.get(input);
      if (record) {
        if (record.promise) {
          this.warn(`Removing cache entry for input ${input} while it is still being computed.`);
        }
        this.__cache.delete(input);
        let value = record.value;
        if (value && value instanceof qx.core.Object) {
          value.dispose();
        }
        this.__updateCleanupTimer();
      } else {
        this.warn(`Attempting to remove a non-existing cache entry for input: ${input}`);
      }
    },

    __updateCleanupTimer() {
      this.__cleanupTimer.setEnabled(this.getExpiryTime() !== 0 && this.__cache.size > 0);
    },

    /**
     * Sweeper task that removes expired values from the cache.
     */
    __cleanupExpiredValues() {
      if (this.getExpiryTime() === 0) return;

      for (let [key, record] of this.__cache.entries()) {
        if (record.value !== undefined && record.lastActive + this.getExpiryTime() < Date.now()) {
          this.remove(key);
        }
      }
    }
  }
});
