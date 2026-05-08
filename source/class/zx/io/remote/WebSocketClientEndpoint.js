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
 * Client-side WebSocket endpoint, parallel to BrowserXhrEndpoint.
 *
 * @ignore(WebSocket)
 */
qx.Class.define("zx.io.remote.WebSocketClientEndpoint", {
  extend: zx.io.remote.NetworkEndpoint,

  /**
   * @param {String?} url WebSocket URL, defaults to "/zx-remote-ws"
   */
  construct(url) {
    super();
    this.__url = url ?? "/zx-remote-ws";
  },

  members: {
    _supportsPushPackets: true,

    /** @type {WebSocket} */
    __ws: null,
    /** @type {String} */
    __url: null,

    /** @override */
    async _startup() {
      let sep = this.__url.indexOf("?") === -1 ? "?" : "&";
      let url = this.__url + sep + "uuid=" + this.getUuid() + "&_t=" + Date.now();
      this.__ws = new WebSocket(url);

      this.__ws.onmessage = async evt => {
        let packets = zx.utils.Json.parseJson(evt.data);
        let responses = await this._receivePackets(null, null, packets);
        if (responses && responses.length) {
          this._flushImpl(responses);
        }
      };

      this.__ws.onclose = () => {
        if (this.isOpen()) {
          this.close();
        }
      };

      await new Promise((resolve, reject) => {
        this.__ws.onopen = resolve;
        this.__ws.onerror = reject;
      });
    },

    /** @override */
    async _shutdown() {
      if (this.__ws) {
        this.__ws.close();
        this.__ws = null;
      }
    },

    /** @override */
    _flushImpl(queuedPackets) {
      if (this.__ws?.readyState === 1 /* WebSocket.OPEN */) {
        this.__ws.send(zx.utils.Json.stringifyJson(queuedPackets));
      }
    }
  }
});
