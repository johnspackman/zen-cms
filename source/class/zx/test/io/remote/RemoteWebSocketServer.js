/* ************************************************************************
 *
 *  Zen [and the art of] CMS
 *
 *  https://zenesis.com
 *
 *  License: MIT (see LICENSE in project root)
 *
 * ************************************************************************ */

/* eslint-env node */

/**
 * Node peer app: starts a Fastify server with the @fastify/websocket plugin
 * and exposes a single Person fixture via zx.io.remote over WebSocket. On
 * startup the actual port (port: 0 picks a free one) is printed as a single
 * JSON line `{ "port": <n> }` so a parent test process can spawn this app
 * and pair it with a matching client peer.
 */
qx.Class.define("zx.test.io.remote.RemoteWebSocketServer", {
  extend: qx.application.Basic,

  members: {
    async main() {
      const fastify = require("fastify");
      const fastifyWebsocket = require("@fastify/websocket");

      let app = fastify({ logger: false });
      await app.register(fastifyWebsocket);

      let controller = new zx.io.remote.NetworkController();
      let listener = new zx.io.remote.WebSocketServerListener(controller, app);

      let person = new zx.test.io.remote.Person("Alice").set({ age: 30 });
      listener.addListener("addEndpoint", evt => {
        let endpoint = evt.getData().endpoint;
        endpoint.putUriMapping("zx.test.io.remote.Person", person);
      });

      await app.listen({ port: 0, host: "127.0.0.1" });
      let address = app.server.address();
      process.stdout.write(JSON.stringify({ port: address.port }) + "\n");
    }
  }
});
