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
*    Patryk Malinowski (@p9malino26)
*    John Spackman (john.spackman@zenesis.com, @johnspackman)
*
* ************************************************************************ */



/**
 * Implementation of server transport for Fastify.js
 */
qx.Class.define("zx.io.api.transport.http.FastifyServerTransport", {
  extend: zx.io.api.server.AbstractServerTransport,

  /**
   * Note: it is expected that the incoming app will use the `zx.io.api.transport.http.ExpressServerTransport.jsonMiddleware`
   * middleware. The result of this middleware is largely the same as `bodyParser.json()`, however it additionally
   * supports communicating certain classes, such as `Date`s, through JSON. See {@link zx.utils.Json} for details on
   * the additional classes supported.
   *
   * @param {import("fastify")} app - the Fastify instance to connect to.
   * @param {Function => Function} wrapMiddleware - a function that wraps the middleware to be used for the route.
   * @param {string} route - the route to listen on. Should not contain wildcards or pattern matches.
   */
  construct(app, wrapMiddleware, route = "/zx-api") {
    super();

    //remove trailing forward slash if there is one
    route.replace(/\/^/, "");
    this.__route = route;
    app.all(`${route}/*`, wrapMiddleware ? wrapMiddleware(this.__handleRequest.bind(this)) : this.__handleRequest.bind(this));
  },

  members: {
    /**
     *
     * @param {Object} req Fastify request object
     * @param {Object} res Fastify response object
     * @returns
     */
    async __handleRequest(req, res) {
      let route = this.__route;
      const RE_ROUTE = new RegExp(`^${route}`);

      let data = qx.lang.Object.clone(
        req.body || {},
        true //deep clone
      );
      let path = zx.utils.Uri.breakoutUri(req.originalUrl).path.replace(RE_ROUTE, "");
      data.path = path;
      data.restMethod = req.method; // TODO: we should only set this if we get a RESTful request; RPC should have no method

      let request = new zx.io.api.server.Request(this, data).set({ restMethod: req.method });
      let response = new zx.io.api.server.Response();
      await zx.io.api.server.ConnectionManager.getInstance().receiveMessage(request, response);

      if (response.getError()) {
        res.status(500).send(response.getError());
        return;
      }

      res.status(200);
      res.send(response.toNativeObject());
    },

    postMessage() {},

    /**@override */
    supportsServerPush() {
      return false;
    }
  }
});
