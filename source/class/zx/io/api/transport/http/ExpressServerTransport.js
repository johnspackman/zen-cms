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
 * Implementation of server transport for Express.js
 */
qx.Class.define("zx.io.api.transport.http.ExpressServerTransport", {
  extend: zx.io.api.server.AbstractServerTransport,

  /**
   * Note: it is expected that the incoming app will use the `zx.io.api.transport.http.ExpressServerTransport.jsonMiddleware`
   * middleware. The result of this middleware is largely the same as `bodyParser.json()`, however it additionally
   * supports communicating certain classes, such as `Date`s, through JSON. See {@link zx.utils.Json} for details on
   * the additional classes supported.
   * @param {import("express").Express} app - the express instance to connect to.
   * @param {string} route - the route to listen on. Should not contain wildcards or pattern matches.
   */
  construct(app, route = "/zx-api/") {
    super();

    //remove trailing forward slash if there is one
    route = route.replace(/\/$/, "");

    const RE_ROUTE = new RegExp(`^${route}`);

    app.all(`${route}/**`, async (req, res) => {
      try {
        let data = qx.lang.Object.clone(req.body, true);
        let path = req.path.replace(RE_ROUTE, "");
        data.path = path;
        data.restMethod = req.method;

        let request = new zx.io.api.server.Request(this, data).set({ restMethod: req.method, query: req.query });
        let response = new zx.io.api.server.Response(request);
        await zx.io.api.server.ConnectionManager.getInstance().receiveMessage(request, response);

        res.status(response.getStatusCode());
        res.send(response.toNativeObject());
      } catch (e) {
        this.error(e);
        res.status(500).send(e.message);
      }
    });
  },

  members: {
    postMessage() {},

    /**@override */
    supportsServerPush() {
      return false;
    }
  },

  statics: {
    /**
     * Middleware for express services. This middleware provides a JSON object at `req.body`, supporting communicating
     * certain additional classes, such as `Date`s, over the network. See {@link zx.utils.Json} for details on the
     * additional classes supported.
     * @example
     * ```js
     * app.use(zx.io.api.transport.http.ExpressServerTransport.jsonMiddleware());
     * ```
     */
    jsonMiddleware() {
      const bodyParser = require("body-parser");

      // TODO: test this middleware
      return (req, res, next) => {
        bodyParser.text()(req, res, () => {
          if (typeof req.body == "string") {
            req.body = zx.utils.Json.parseJson(req.body);
          }
          next();
        });
      };
    }
  }
});
