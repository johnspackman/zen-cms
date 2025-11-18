/**
 * This class is used to defer the handling of ZX API requests.
 * Useful when we want to process a request on a different process or machine.
 * You need to derive from the class, override the `_createTransportForHostname` method,
 * which will create a transport for the Forward-To hosthame of this request.
 * The request will be forwarded to that transport, which will take care of it.
 */
qx.Class.define("zx.io.api.server.AbstractProxyManager", {
  extend: qx.core.Object,
  construct() {
    super();
    const MINUTE = 60 * 1000;
    this.__transportCache = new zx.utils.FunctionResultCache().set({
      generator: hostName => this._createTransportForHostname(hostName),
      expiryTime: 5 * MINUTE
    });
  },
  members: {
    /**
     * @type {zx.utils.FunctionResultCache<zx.io.api.client.AbstractClientTransport>}
     * A cache that stores transports for hostnames.
     */
    __transportCache: null,

    /**
     * Called by zx.io.api.server.ConnectionManager.
     * @param {zx.io.api.server.Request} request
     * @param {zx.io.api.server.Response} response
     * @returns {Promise<boolean>} True if the request was handled by this proxy, false if not.
     */
    async processRequest(request, response) {
      let forwardTo = request.getHeader("Forward-To");
      if (!forwardTo) {
        return false; // No forwarding header, do nothing
      }

      let cache = this.__transportCache;

      let transport;

      transport = await cache.get(forwardTo);

      request.removeHeader("Forward-To");
      try {
        await transport.sendRequest(request, response);
      } catch (e) {
        cache.remove(forwardTo); // Remove from cache if there was an error
        throw e;
      }
      cache.keepAlive(forwardTo); // To prevent the cache from expiring after timeout
      return true;
    },

    /**
     * @abstract
     *
     * Override this method to create a transport for the given hostname.
     *
     * @param {string} hostname
     * @returns {Promise<zx.io.api.client.AbstractClientTransport> | zx.io.api.client.AbstractClientTransport}
     */
    _createTransportForHostname(hostname) {
      throw new Error(`${this.classname}._createTransportForHostname is abstract.`);
    }
  }
});
