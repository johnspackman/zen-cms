/* ************************************************************************
 *
 *  Zen [and the art of] CMS
 *
 *  https://zenesis.com
 *
 *  License: MIT (see LICENSE in project root)
 *
 * ************************************************************************ */

/**
 * Fastify-WebSocket listener; one per app instance. Pairs with
 * WebSocketServerEndpoint per connection.
 */
qx.Class.define("zx.io.remote.WebSocketServerListener", {
  extend: qx.core.Object,

  /**
   * @param {zx.io.remote.NetworkController} controller
   * @param {import("fastify").FastifyInstance} app
   * @param {Object?} options
   * @param {String?} options.route defaults to "/zx-remote-ws"
   */
  construct(controller, app, options) {
    super();
    this.__controller = controller;
    let route = options?.route ?? "/zx-remote-ws";
    app.get(route, { websocket: true }, (socket, req) =>
      this.__handleConnection(socket, req)
    );
  },

  events: {
    /**
     * Fires after a new endpoint has been created and added to the
     * controller. Event data: { endpoint, request }.
     */
    addEndpoint: "qx.event.type.Data"
  },

  members: {
    /** @type {zx.io.remote.NetworkController} */
    __controller: null,

    __handleConnection(socket, req) {
      let uuid = req?.query?.uuid ?? null;
      let endpoint = new zx.io.remote.WebSocketServerEndpoint(socket, uuid);

      socket.on("message", async data => {
        await endpoint.receiveFromClient(data.toString());
      });
      socket.on("close", () => {
        this.__controller.removeEndpoint(endpoint);
        endpoint.close();
      });

      this.__controller.addEndpoint(endpoint);
      endpoint.open();
      this.fireDataEvent("addEndpoint", { endpoint, request: req });
    }
  }
});
