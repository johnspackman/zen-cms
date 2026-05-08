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
 * Node peer app: connects to a RemoteWebSocketServer instance specified via
 * the `ZX_TEST_WS_PORT` environment variable, fetches the Person fixture and
 * prints `{ "name": "<value>" }` to stdout before exiting. Pairs with the
 * RemoteWebSocketServer peer app for end-to-end WebSocket transport tests.
 */
qx.Class.define("zx.test.io.remote.DemoRemoteWebSocketClient", {
  extend: qx.application.Basic,

  members: {
    async main() {
      let port = process.env.ZX_TEST_WS_PORT;
      if (!port) {
        process.stderr.write("ZX_TEST_WS_PORT not set\n");
        process.exit(2);
        return;
      }

      let controller = new zx.io.remote.NetworkController();
      let endpoint = new zx.io.remote.WebSocketClientEndpoint(
        `ws://127.0.0.1:${port}/zx-remote-ws`
      );
      controller.addEndpoint(endpoint);
      await endpoint.open();

      let person = await controller.getUriMappingAsync("zx.test.io.remote.Person");
      process.stdout.write(JSON.stringify({ name: person.getName() }) + "\n");

      await endpoint.close();
      process.exit(0);
    }
  }
});
