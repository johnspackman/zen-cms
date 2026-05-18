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
 * Server-side WebSocket endpoint. One per connection.
 */
qx.Class.define("zx.io.remote.WebSocketServerEndpoint", {
  extend: zx.io.remote.NetworkEndpoint,

  /**
   * @param {Object} socket WebSocket connection from @fastify/websocket
   * @param {String?} uuid UUID to use; if omitted a fresh one is generated
   */
  construct(socket, uuid) {
    super(uuid);
    this.__socket = socket;
  },

  events: {
    /**
     * Fires before incoming packets are processed. Listeners may set
     * evt.getData().wrapper to an `async fn => ...` wrapper that the
     * endpoint will await around `_receivePackets`. Useful for
     * request-scoped context (auth, tenant, db transaction).
     */
    beforeReceive: "qx.event.type.Data"
  },

  members: {
    _supportsPushPackets: true,

    /** @type {Object} */
    __socket: null,

    /** @override */
    getUniqueIndexId() {
      return "WS:" + this.getUuid();
    },

    /** @override */
    _flushImpl(queuedPackets) {
      if (this.__socket?.readyState === 1 /* OPEN */) {
        this.__socket.send(zx.utils.Json.stringifyJson(queuedPackets));
      }
    },

    /**
     * Called by the listener for every inbound message frame.
     * @param {String} data raw JSON
     */
    async receiveFromClient(data) {
      let packets;
      try {
        packets = zx.utils.Json.parseJson(data);
      } catch (ex) {
        qx.log.Logger.error(this, "Invalid JSON received", ex);
        return;
      }

      let evtData = { packets, wrapper: null };
      this.fireDataEvent("beforeReceive", evtData);
      let wrapper = evtData.wrapper ?? (fn => fn());

      try {
        await wrapper(async () => {
          let responses = await this._receivePackets(null, null, packets);
          if (responses && responses.length) {
            this._flushImpl(responses);
          }
        });
      } catch (ex) {
        qx.log.Logger.error(this, "Error processing message", ex);
        let errors = packets
          .filter(p => p.type === "callMethod")
          .map(p => ({
            type: "return",
            originPacketId: p.packetId,
            methodName: p.methodName,
            exception: { message: ex.message }
          }));
        if (errors.length) {
          this._flushImpl(errors);
        }
      }
    }
  }
});
