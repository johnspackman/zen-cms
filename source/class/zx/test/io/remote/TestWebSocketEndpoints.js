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
 * Unit tests for the WebSocket transport in zx.io.remote.
 */
qx.Class.define("zx.test.io.remote.TestWebSocketEndpoints", {
  extend: qx.dev.unit.TestCase,

  members: {
    async testPeerRoundtrip() {
      const { spawn } = require("child_process");

      let serverProc = spawn(
        "npx",
        ["qx", "run", "--app=peer-ws-server"],
        { shell: true, env: process.env }
      );

      let port = await new Promise((resolve, reject) => {
        let buf = "";
        let done = false;
        let timeout = setTimeout(() => {
          if (!done) {
            done = true;
            reject(new Error("Timeout waiting for server port"));
          }
        }, 30000);
        serverProc.stdout.on("data", chunk => {
          buf += chunk.toString();
          let nl = buf.indexOf("\n");
          while (nl !== -1) {
            let line = buf.substring(0, nl).trim();
            buf = buf.substring(nl + 1);
            if (line.startsWith("{")) {
              try {
                let parsed = JSON.parse(line);
                if (parsed.port && !done) {
                  done = true;
                  clearTimeout(timeout);
                  resolve(parsed.port);
                  return;
                }
              } catch (ex) {
                // not the line we wanted, keep going
              }
            }
            nl = buf.indexOf("\n");
          }
        });
        serverProc.on("exit", code => {
          if (!done) {
            done = true;
            clearTimeout(timeout);
            reject(new Error("Server exited prematurely with code " + code));
          }
        });
      });

      try {
        let clientOut = await new Promise((resolve, reject) => {
          let env = Object.assign({}, process.env, { ZX_TEST_WS_PORT: String(port) });
          let clientProc = spawn(
            "npx",
            ["qx", "run", "--app=peer-ws-client"],
            { shell: true, env }
          );
          let buf = "";
          clientProc.stdout.on("data", chunk => (buf += chunk.toString()));
          clientProc.on("exit", code => {
            if (code !== 0) {
              reject(new Error("Client exited with code " + code));
            } else {
              resolve(buf);
            }
          });
        });

        let nameLine = clientOut
          .split("\n")
          .map(l => l.trim())
          .filter(l => l.startsWith("{") && l.includes("name"))
          .pop();
        this.assertNotNull(nameLine, "no name line in client output");
        let parsed = JSON.parse(nameLine);
        this.assertEquals("Alice", parsed.name);
      } finally {
        serverProc.kill();
      }
    },

    async testBeforeReceiveHook() {
      let order = [];
      let socket = { readyState: 1, send() {} };
      let endpoint = new zx.io.remote.WebSocketServerEndpoint(socket);

      endpoint._receivePackets = async () => {
        order.push("receive");
        return [];
      };

      endpoint.addListener("beforeReceive", evt => {
        order.push("before");
        let data = evt.getData();
        data.wrapper = async fn => {
          await fn();
          order.push("after");
        };
      });

      await endpoint.receiveFromClient("[]");

      this.assertEquals("before,receive,after", order.join(","));
    },

    async testExceptionProducesReturnPackets() {
      let sent = [];
      let socket = {
        readyState: 1,
        send(data) {
          sent.push(data);
        }
      };
      let endpoint = new zx.io.remote.WebSocketServerEndpoint(socket);

      endpoint._receivePackets = async () => {
        throw new Error("boom");
      };

      let inbound = [{ type: "callMethod", packetId: 1, methodName: "doStuff" }];
      await endpoint.receiveFromClient(JSON.stringify(inbound));

      this.assertEquals(1, sent.length);
      let packets = JSON.parse(sent[0]);
      this.assertEquals(1, packets.length);
      this.assertEquals("return", packets[0].type);
      this.assertEquals(1, packets[0].originPacketId);
      this.assertEquals("boom", packets[0].exception.message);
    }
  }
});
