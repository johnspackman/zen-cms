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
 * Unit tests for the zx.io.remote remote-event annotation and
 * NetworkEndpoint propagation.
 */
qx.Class.define("zx.test.io.remote.TestRemoteEvents", {
  extend: qx.dev.unit.TestCase,

  members: {
    /**
     * Creates a DummyNetworkEndpoint whose _flushImpl pushes every
     * outbound packet to the returned `flushed` array.
     */
    __setupCapture() {
      let flushed = [];
      let endpoint = new zx.test.io.remote.DummyNetworkEndpoint();
      endpoint._flushImpl = packets => {
        for (let p of packets) {
          flushed.push(p);
        }
      };
      let controller = new zx.io.remote.NetworkController();
      controller.addEndpoint(endpoint);
      return { endpoint, controller, flushed };
    },

    async testEventIsFlushedAsRemoteEventPacket() {
      let { endpoint, flushed } = this.__setupCapture();
      let obj = new zx.test.io.remote.RemoteEventFixture();
      await endpoint.put(obj);

      flushed.length = 0;
      obj.fireDataEvent("dataReady", { x: 42 });
      await endpoint.flush();

      let evtPackets = flushed.filter(p => p.type === "zx:remoteEvent");
      this.assertEquals(1, evtPackets.length);
      this.assertEquals("dataReady", evtPackets[0].eventName);
      this.assertEquals(obj.toUuid(), evtPackets[0].uuid);
      this.assertEquals(42, evtPackets[0].data.x);

      endpoint.dispose();
    },

    async testFireEventWithoutDataIsNull() {
      let { endpoint, flushed } = this.__setupCapture();
      let obj = new zx.test.io.remote.RemoteEventFixture();
      await endpoint.put(obj);

      flushed.length = 0;
      obj.fireEvent("dataReady");
      await endpoint.flush();

      let evt = flushed.find(p => p.type === "zx:remoteEvent");
      this.assertNotNull(evt);
      this.assertNull(evt.data);

      endpoint.dispose();
    },

    async testNonAnnotatedEventsAreNotForwarded() {
      let { endpoint, flushed } = this.__setupCapture();
      let obj = new zx.test.io.remote.RemoteEventFixture();
      await endpoint.put(obj);

      flushed.length = 0;
      obj.fireDataEvent("silent", "irrelevant");
      await endpoint.flush();

      let evtPackets = flushed.filter(p => p.type === "zx:remoteEvent");
      this.assertEquals(0, evtPackets.length);

      endpoint.dispose();
    },

    async testUnwatchObjectRemovesEventListeners() {
      let { endpoint, flushed } = this.__setupCapture();
      let obj = new zx.test.io.remote.RemoteEventFixture();
      await endpoint.put(obj);
      endpoint.unwatchObject(obj);

      flushed.length = 0;
      obj.fireDataEvent("dataReady", { x: 1 });
      await endpoint.flush();

      let evtPackets = flushed.filter(p => p.type === "zx:remoteEvent");
      this.assertEquals(0, evtPackets.length);

      endpoint.dispose();
    },

    async testIncomingRemoteEventTriggersFireDataEvent() {
      let { endpoint } = this.__setupCapture();
      let obj = new zx.test.io.remote.RemoteEventFixture();
      await endpoint.put(obj);

      let received = null;
      obj.addListener("dataReady", evt => {
        received = evt.getData();
      });

      await endpoint._receivePacketsImpl({
        packets: [
          {
            type: "zx:remoteEvent",
            uuid: obj.toUuid(),
            eventName: "dataReady",
            data: { y: 7 }
          }
        ]
      });

      this.assertNotNull(received);
      this.assertEquals(7, received.y);

      endpoint.dispose();
    }
  }
});
