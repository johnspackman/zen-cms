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
 *    John Spackman (john.spackman@zenesis.com, @johnspackman)
 *    Patryk Malinowski (@patryk-m-malinowski)
 *
 * ************************************************************************ */

const express = require("express");
/**
 * Application used for running a server for the remote API HTTP demo
 */
qx.Class.define("zx.demo.io.api.srv.ServerApp", {
  extend: qx.application.Basic,
  members: {
    async main() {
      qx.log.Logger.register(zx.utils.NativeLogger);
      debugger; //now is a good time to break on caught exceptions
      let app = express();

      let port = 8080;
      let userPort = process.argv[2];

      if (userPort) {
        if (!userPort.startsWith("--port=")) {
          throw new Error("Argument must be in the form --port=<number>, got: " + userPort);
        }
        port = userPort.split("=")[1];
      }

      app.use(zx.io.api.transport.http.ExpressServerTransport.jsonMiddleware());
      app
        .use("/", express.static("compiled/source/remote-api-browser-test"))
        .use("/transpiled", express.static("compiled/source/transpiled"))
        .use("/resource", express.static("compiled/source/resource"))
        .listen(port, () => {
          console.log(`Server is running on port ${port}`);
        });
      let transport = new zx.io.api.transport.http.ExpressServerTransport(app);
      let connectionManager = zx.io.api.server.ConnectionManager.getInstance();
      connectionManager.registerApi(new zx.demo.io.api.PlayerMediaServerApi(), "/player/media");
      connectionManager.registerApi(new zx.demo.io.api.PlayerMediaServerApi());
      connectionManager.registerApi(new zx.demo.io.api.WifiServerApi(), "/player/wifi");
      connectionManager.registerApi(new zx.demo.io.api.WifiServerApi());
    }
  }
});
