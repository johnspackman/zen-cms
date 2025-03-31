/* ************************************************************************

   Copyright: 2024 undefined

   License: MIT license

   Authors: undefined

************************************************************************ */

/**
 * This is the main application class of "zx.demo.io.api"
 *
 * @asset(zx.demo.io.api/*)
 */
// const Buffer = require("node:buffer");
qx.Class.define("zx.demo.io.api.TestApp", {
  extend: qx.application.Standalone,

  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members: {
    /**
     * This method contains the initial application code and gets called
     * during startup of the application
     *
     * @lint ignoreDeprecated(alert)
     */
    main() {
      // Call super class
      super.main();

      // Enable logging in debug variant
      if (qx.core.Environment.get("qx.debug")) {
        // support native logging capabilities, e.g. Firebug for Firefox
        qx.log.appender.Native;
        // support additional cross-browser console. Press F7 to toggle visibility
        qx.log.appender.Console;
      }

      /*
      -------------------------------------------------------------------------
        Below is your actual application code...
      -------------------------------------------------------------------------
      */

      // Create a button
      let label = new qx.ui.basic.Label("Remote API Test");

      // Document is the application root
      let doc = this.getRoot();

      // Add button to document at fixed coordinates
      doc.add(label, { left: 100, top: 50 });

      // Add an event listener
      // button1.addListener("execute", this.__runTest, this);
      this.__runTest();
    },

    async __runTest() {
      // let clientTransport = this.__getBrowserClientTransport();
      let clientTransport = this.__getHttpClientTransport();
      //Server

      //Client
      let clientApi = new zx.demo.io.api.PlayerMediaClientApi(clientTransport, "/player/media");
      await clientApi.subscribe("playingMedia", media => {
        console.log(`Playing media with id ${media}`);
      });

      console.log("before getting current media");
      let media = await clientApi.getCurrentMedia();
      console.log(`Current media is ${media}`);
      await clientApi.playMedia(777);
      media = await clientApi.getCurrentMedia();
      console.log(`Current media then is ${media}`);

      let wifiApi = new zx.demo.io.api.WifiClientApi(clientTransport);
      await wifiApi.subscribe("changeOnlineStatus", online => {
        console.log(`Online status changed to ${online}`);
      });

      let online = await wifiApi.isOnline();
      console.log(`Online status is ${online}`);
    },

    __getHttpClientTransport() {
      let transport = new zx.io.api.transport.http.HttpClientTransport("/zx-api/");
      return transport;
    },

    __getBrowserClientTransport() {
      let serverTransport = new zx.io.api.transport.loopback.LoopbackServerTransport();
      let clientTransport = new zx.io.api.transport.loopback.LoopbackClientTransport();
      serverTransport.connect(clientTransport);
      clientTransport.connect(serverTransport);

      let connectionManager = zx.io.api.server.ConnectionManager.getInstance();
      connectionManager.registerApi(new zx.demo.io.api.PlayerMediaServerApi(), "/player/media");
      connectionManager.registerApi(new zx.demo.io.api.WifiServerApi());

      return clientTransport;
    },

    async testInactivity() {}
  }
});
