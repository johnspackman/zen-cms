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
 *    Will Johnson (@willsterjohnsonatzenesis)
 *
 * ************************************************************************ */

/**
 * Handles the pooling of resources for reuse given a factory and (optional) paired destructor
 *
 * The pool will ensure that it has at least as many resources as the minimum size, and will create new resources as
 * needed up to the maximum size. If the pool is full and all resources are in use, the acquisition of a resource will
 * wait for up to the timeout milliseconds before failing, conducting a check every pollInterval milliseconds.
 *
 * @template TResource
 */
qx.Class.define("zx.utils.Pool", {
  extend: qx.core.Object,

  construct() {
    super();
    this.__pool = new Map();
  },

  properties: {
    /** Minimum number of resources to keep in the pool */
    minSize: {
      check: "Number",
      init: 0,
      event: "changeMinSize",
      apply: "_applyMinSize"
    },

    /** Maximum number of resources to keep in the pool */
    maxSize: {
      check: "Number",
      init: 10,
      event: "changeMaxSize",
      apply: "_applyMaxSize"
    },

    /** When waiting for a resource to become available, how long to wait before throwing an exception */
    timeout: {
      check: "Number",
      init: 30_000
    },

    /** When waiting for a resource to become available, how long to sleep before checking again */
    pollInterval: {
      check: "Number",
      event: "changePollInterval",
      init: 5_000
    },

    /** The factory for creating and deleting resources */
    factory: {
      check: "zx.utils.IPoolFactory"
    }
  },

  events: {
    /** Fired when a resource is now available, when previously none were available */
    becomeAvailable: "qx.event.type.Event",

    /** Fired when no resources are available, when previously there were some available */
    becomeUnavailable: "qx.event.type.Event",

    /** Fired when a resource is created, the data is the resource */
    createResource: "qx.event.type.Data",

    /** Fired when a resource is about to be destroyed, the data is the resource */
    destroyResource: "qx.event.type.Data"
  },

  members: {
    /**@type {Map<TResource, Symbol>} */
    __pool: null,

    /**@type {boolean}*/
    __live: false,

    /**@type {boolean}*/
    __available: false,

    __shutdownCompletePromise: null,

    /**
     * Apply method for `minSize`
     */
    _applyMinSize(value) {
      if (value < 0) {
        throw new Error("Cannot set minSize to be less than 0");
      }
      if (value > this.getMaxSize()) {
        throw new Error("Cannot set minSize to be greater than maxSize");
      }
      if (this.__live) {
        this.__topup();
      }
    },

    /**
     * Apply method for `maxSize`
     */
    _applyMaxSize(value) {
      if (value < this.getMinSize()) {
        throw new Error("Cannot set maxSize to be less than minSize");
      }
      if (this.__live) {
        this.__trim();
      }
    },

    /**
     * Top up the pool to the minimum size
     */
    async __topup() {
      if (this.__pool.size >= this.getMinSize()) {
        return;
      }
      await this.__createNewResource();
    },

    /**
     * Trim the pool to the maximum size
     */
    async __trim() {
      let needsTrim = this.__pool.size > this.getMinSize();
      for (let [resource, availability] of this.__pool) {
        if (!needsTrim) {
          break;
        }
        if (availability === zx.utils.Pool.UNAVAILABLE) {
          continue;
        }
        await this.__destroyResource(resource);
        needsTrim = this.__pool.size > this.getMinSize();
      }
    },

    /**
     * startup the pool, begins maintaining the pool size based on `minSize`
     */
    async startup() {
      if (this.__live) {
        return;
      }
      this.__topup();
      this.__updateAvailability();
      this.__live = true;
    },

    /**
     * Safely shut down the pool, destroying all resources
     */
    async shutdown() {
      if (!this.__live) {
        return;
      }
      this.__live = false;
      for (let resource of this.__pool.keys()) {
        if (this.__pool.get(resource) === zx.utils.Pool.AVAILABLE) {
          await this.__destroyResource(resource);
        }
      }
      if (this.__pool.size > 0) {
        let promise = (this.__shutdownCompletePromise = new qx.Promise());
        await promise;
      }
      this.__updateAvailability();
    },

    /**
     * @returns {boolean} whether this pool has available resources
     */
    available() {
      if (!this.__live) {
        return false;
      }
      for (let availability of this.__pool.values()) {
        if (availability === zx.utils.Pool.AVAILABLE) {
          return true;
        }
      }
      return this.__pool.size < this.getMaxSize();
    },

    /**
     * Acquires a resource from the pool, creating if necessary.
     * If the pool is full, waits and rechecks according to the configuration properties.
     * @returns {TResource} a resource
     */
    async acquire() {
      if (!this.__live) {
        throw new Error("Cannot acquire because the pool is not live - call 'startup' to start the pool");
      }
      let resource = await this.__getOrCreateResource();
      this.__pool.set(resource, zx.utils.Pool.UNAVAILABLE);
      this.__updateAvailability();
      return resource;
    },

    /**
     * Mark a resource as unneeded, making it available for reuse.
     * @param {TResource} resource - a resource
     */
    async release(resource) {
      if (!this.__live) {
        this.__destroyResource(resource);
      } else {
        this.__pool.set(resource, zx.utils.Pool.AVAILABLE);
      }
      this.__updateAvailability();
    },

    /**
     * Destroy a resource
     *
     * @param {TResource} resource - a resource
     */
    async destroyResource(resource) {
      this.__destroyResource(resource);
      this.__updateAvailability();
    },

    /**
     * Update this pools availability, firing events as necessary
     */
    __updateAvailability() {
      let latestAvailability = this.available();
      if (!this.__available && latestAvailability) {
        this.__available = true;
        this.fireEvent("becomeAvailable");
      }
      if (this.__available && !latestAvailability) {
        this.__available = false;
        this.fireEvent("becomeUnavailable");
      }
    },

    /**
     * Creates a resource
     * @returns {TResource} a resource
     */
    async __createNewResource() {
      let resource = await this.getFactory().createPoolableEntity();
      this.fireDataEvent("createResource", resource);
      this.__pool.set(resource, zx.utils.Pool.AVAILABLE);
      return resource;
    },

    /**
     * Destroys a resource, only if it is not in use
     * @param {TResource} resource - a resource
     */
    async __destroyResource(resource) {
      this.fireDataEvent("destroyResource", resource);
      this.__pool.delete(resource);
      await this.getFactory().destroyPoolableEntity(resource);
      if (this.__shutdownCompletePromise && this.__pool.size === 0) {
        this.__shutdownCompletePromise.resolve();
      }
    },

    /**
     * Gets an existing resource, or creates a new one if none are available. Implements a timeout-retry loop.
     * @returns {TResource} a resource
     */
    async __getOrCreateResource() {
      let startTime = Date.now();
      while (true) {
        for (let [resource, availability] of this.__pool) {
          if (availability === zx.utils.Pool.UNAVAILABLE) {
            continue;
          }
          return resource;
        }

        if (this.__pool.size < this.getMaxSize()) {
          return await this.__createNewResource();
        }

        if (Date.now() - startTime > this.getTimeout()) {
          throw new Error("Timeout acquiring resource");
        }

        await zx.utils.Timeout.sleep(this.getPollInterval());
      }
    },

    /**
     * Returns the size of the pool
     *
     * @returns {Integer}
     */
    getSize() {
      return this.__pool.size;
    }
  },

  statics: {
    AVAILABLE: Symbol("AVAILABLE"),
    UNAVAILABLE: Symbol("UNAVAILABLE")
  }
});
