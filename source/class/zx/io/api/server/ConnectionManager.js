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
 * Connection manager for the server
 * Takes in request from the server transport (zx.io.api.server.AbstractServerTransport),
 * processes them and populates the response
 */
qx.Class.define("zx.io.api.server.ConnectionManager", {
  extend: qx.core.Object,
  type: "singleton",

  construct() {
    super();
    this.__apisByName = {};
    this.__apisByPath = {};
  },
  members: {
    /**
     * @type {{[apiName: string]: zx.io.api.server.AbstractServerApi}}
     * Maps API names to APIs registered with this connection manager
     */
    __apisByName: null,

    /**
     * @type {{[path: string]: zx.io.api.server.AbstractServerApi}}
     * Maps path names that the APIs were registered with to the APIs themselves
     */
    __apisByPath: null,

    /**
     * Adds an API, either globally or by path.
     * If a path is provided, incoming requests for that API instance must have their path property (@see zx.io.api.server.Request#path) set to that path.
     * They cannot be access solely by their API name in the request's header.
     *
     * @param {(new () => zx.io.api.server.AbstractServerApi) | zx.io.api.server.AbstractServerApi} api API class or instance
     * @param {String?} path Optional path to register the API under
     */
    registerApi(api, path) {
      if (!(api instanceof qx.core.Object)) {
        api = new api();
      }

      let apiName = api.getApiName();
      if (path) {
        if (this.__apisByPath[path]) {
          throw new Error(`API with name ${apiName} already registered`);
        }
        this.__apisByPath[path] = api;
        api.setPath(path);
      } else {
        if (this.__apisByName[api.getApiName()]) {
          throw new Error(`API with name ${apiName} already registered`);
        }
        this.__apisByName[api.getApiName()] = api;
      }
    },

    /**
     * Call this method by your transport (IServerTransport) after it receives a message.
     *
     * This method will serve the request, and then populate the response object.
     * Your transport should then take the data from the response object and send it back to the client,
     * which is transport dependent i.e. a websocket transport would simply push the data back,
     * while a HTTP transport would send the data back in the response to its request.
     *
     * @param {zx.io.api.server.Request} request
     * @param {zx.io.api.server.Response} response
     */
    async receiveMessage(request, response) {
      let apiName = request.getHeader("Api-Name");

      if (!apiName) {
        let rgx = new RegExp(`^/${zx.io.api.server.AbstractServerApi.GLOBAL_API_PREFIX}/(.+?)/`);
        let match = rgx.exec(request.getPath());
        if (match) {
          apiName = match[1];
        }
      }

      //Get the API instance
      let api = null;
      if (apiName) {
        api = this.__apisByName[apiName];

        if (!api) {
          throw new Error(`API ${apiName} not found. Did you forget to register it?`);
        }
      } else if (request.getType() !== "poll" && request.getPath()) {
        let requestPath = request.getPath();
        for (let [apiPath, api_] of Object.entries(this.__apisByPath)) {
          if (requestPath == apiPath || requestPath.startsWith(apiPath + "/")) {
            api = api_;
            break;
          }
        }

        if (!api) {
          throw new Error(`API which is prefix of path ${request.getPath()} not found. Did you forget to register it?`);
        }
      } else if (request.getType() !== "poll") {
        throw new Error(`Non-poll requests must have an 'Api-Name' header or 'path' property set`);
      }

      if (api) {
        //Call the API
        await api.receiveMessage(request, response);
      } else if (request.getType() !== "poll") {
        throw new Error(`API not found for non-poll request`);
      }

      //Session
      let session = request.getSession();

      //Get any queued publications from the session
      //publications are queued if the transport does not support server push e.g. HTTP
      if (session) {
        session.setLastActivity(new Date());
        for (let publication of session.consumePublicationsQueue()) {
          this.debug("Sending publication to transport", { publication, session });
          response.addData(publication);
        }
      }
    },

    /**
     * Pushes any pending publications in a session to its transport, for a given particular API
     * Called EXCLUSIVELY by the session class (zx.io.api.server.Session) when it wants to publish
     * NOTE: This method is only called when the session's transport supports server push!
     * @param {zx.io.api.server.Session} session
     * @param {zx.io.api.server.AbstractServerApi} api
     */
    flushPublicationsQueue(session) {
      let transport = session.getTransport();
      let response = transport.createPushResponse(session);

      for (let publication of session.consumePublicationsQueue()) {
        response.addData(publication);
      }

      transport.sendPushResponse(response);
    }
  }
});
