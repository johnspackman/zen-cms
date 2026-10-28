/* ************************************************************************
 *
 *  Zen [and the art of] CMS
 *
 *  https://zenesis.com
 *
 *  Copyright:
 *    2019-2022 Zenesis Ltd, https://www.zenesis.com
 *
 *  License:
 *    MIT (see LICENSE in project root)
 *
 *  Authors:
 *    John Spackman (john.spackman@zenesis.com, @johnspackman)
 *
 * ************************************************************************ */

qx.Class.define("zx.io.remote.BrowserXhrEndpoint", {
  extend: zx.io.remote.NetworkEndpoint,

  /**
   * Constructor
   *
   * @param {String?} url if null then default is used
   */
  construct(url) {
    super();
    this.__url = url || "/zx/io/xhr";
  },

  properties: {
    /**
     * Whether this page is to share its connection with other pages - setting to false
     * will allow multiple tabs on a browser to operate independently
     */
    shareConnection: {
      init: true,
      check: "Boolean"
    },

    /** How often to poll the server if there is no other I/O */
    pollFrequency: {
      init: 1000,
      nullable: false,
      check: "Integer"
    },

    /** Whether to poll the server */
    polling: {
      init: false,
      check: "Boolean",
      event: "changePolling",
      apply: "_applyPolling"
    },

    /** Timeout to allow on XHR */
    timeout: {
      init: null,
      nullable: true,
      check: "Integer"
    }
  },

  environment: {
    "zx.io.remote.BrowserXhrEndpoint.traceIo": false,
    "zx.io.remote.BrowserXhrEndpoint.sessionTracing": false
  },

  members: {
    __timerId: null,
    __firstRequest: true,

    /*
     * @Override
     */
    async _shutdown() {
      this.setPolling(false);
      await super._shutdown();
    },

    /**
     * Handles the poll timeout
     */
    __onPollTimeout() {
      this._flushImpl([], true);
      this.__queueNextPoll();
    },

    /**
     * Apply for `polling`
     */
    _applyPolling(value) {
      this.__clearPollTimeout();
      this.__queueNextPoll();
    },

    /**
     * Queues the next poll
     */
    __queueNextPoll() {
      if (!this.isPolling() || this.__inSend) {
        return;
      }

      this.__timerId = setTimeout(() => {
        this.__timerId = null;
        this.__onPollTimeout();
      }, this.getPollFrequency());
    },

    __clearPollTimeout() {
      if (this.__timerId) {
        clearTimeout(this.__timerId);
        this.__timerId = null;
      }
    },

    /*
     * @Override
     */
    _flushImpl(queuedPackets, polling) {
      if (!queuedPackets.length && !polling) {
        return;
      }
      this.__clearPollTimeout();
      if (this.__inSend) {
        if (!this.__sendQueue) {
          this.__sendQueue = [];
        }
        qx.lang.Array.append(this.__sendQueue, queuedPackets);
        return;
      }

      const onComplete = async options => {
        if (options.statusCode == 200) {
          let packets = zx.utils.Json.parseJson(options.content);
          await this._receive(packets);
        } else {
          for (let packet of queuedPackets) {
            let promise = this._pendingPromises[packet.packetId];
            delete this._pendingPromises[packet.packetId];
            if (!promise) {
              continue;
            }
            promise.reject(new Error(options.statusMessage));
          }
          await this._error(options.statusCode);
        }

        if (this.__sendQueue) {
          let sendQueue = this.__sendQueue;
          this.__sendQueue = null;
          this.__inSend = false;
          this._flushImpl(sendQueue, false);
          return;
        }

        this.__inSend = false;
        this.__queueNextPoll();
      };

      this.__inSend = true;
      this._send({
        handler: onComplete,
        body: queuedPackets
      });
    },

    /**
     * Called to handle I/O errors
     *
     * @param {Integer} statusCode
     * @param {String} statusMessage
     */
    async _error(statusCode, statusMessage) {
      // TODO
      this.error(`XHR Error: statusCode=${statusCode}, statusMessage=${statusMessage}`);
    },

    /**
     * Called to handle received data
     * @param {*} body
     */
    async _receive(body) {
      let responses = await this._receivePackets(null, null, body);
      if (responses && responses.length) {
        this._flushImpl(responses);
      }
    },

    /**
     * Sends data
     *
     * @param options {Map} containing
     *  headers {Map<String,String>?} map of headers to send
     *  body {String} body
     *  handler {Function} callback on completion
     *  handlerContextData {Object} data to pass to the callback on completion
     */
    _send(options) {
      let { headers, body } = options;
      headers = qx.lang.Object.clone(headers);
      let firstRequest = this.__firstRequest;
      this.__firstRequest = false;

      let req = null;

      const getResponseHeaders = () => {
        let headers = {};
        req
          .getAllResponseHeaders()
          .split(/\n/)
          .forEach(line => {
            let m = line.trim().match(/^([^:]+)\s*:\s*(.*)$/);
            if (m) {
              let key = m[1];
              let value = m[2];
              headers[key] = value;
            }
          });
        return headers;
      };

      const onFailure = evt => {
        let content = req.getResponseText();
        let statusCode = req.getStatus();
        let statusMessage = req.getStatusText();
        if (!statusMessage || !statusMessage.length) {
          statusMessage = content || "Unknown error";
        }
        this.debug(`XHR Failure: statusCode=${statusCode}, statusMessage=${statusMessage}, content=${content}`);
        req.dispose();
        options.handler({
          statusMessage,
          statusCode,
          type: evt.getType(),
          handlerContextData: options.handlerContextData
        });
      };

      const onSuccess = evt => {
        let statusCode = req.getStatus();
        let responseHeaders = getResponseHeaders();
        let content = req.getResponseText();

        req.dispose();

        var sha = responseHeaders["x-zx-io-remote-sha1"];
        if (sha != null) {
          var digest = zx.utils.Sha.sha1(content);
          if (sha != digest) {
            throw new Error("Invalid SHA received from server, expected=" + sha + ", found=" + digest);
          }
        }

        options.handler({
          content: content,
          statusCode: statusCode,
          handlerContextData: options.handlerContextData,
          responseHeaders: responseHeaders
        });
      };

      const createRequest = () => {
        let req = new qx.io.request.Xhr(this.__url, "POST", "text/plain");
        let headers = {};
        req.setAsync(true);
        req.setTimeout(this.getTimeout());

        // You must set the character encoding explicitly; even if the page is
        // served as UTF8 and everything else is UTF8, not specifying can lead
        //  to the server screwing up decoding (presumably the default charset).
        var charset = document.characterSet || document.charset || "UTF-8";
        headers["Content-Type"] = "text/plain; charset=" + charset;

        // Send it
        if (qx.core.Environment.get("zx.io.remote.BrowserXhrEndpoint.traceIo")) {
          // Use console.log because LogAppender would cause recursive logging
          console.log && console.log("Sending to server: " + body);
        }

        let bodyAsString = zx.utils.Json.stringifyJson(body);
        if (qx.core.Environment.get("qx.debug")) {
          headers["X-Zx-Io-Remote-SHA1"] = zx.utils.Sha.sha1(bodyAsString);
        }

        headers["X-Zx-Io-Remote-ClientTime"] = new Date().getTime();
        headers["X-Zx-Io-Remote-SessionUuid"] = this.getUuid();
        headers["X-Zx-Io-Remote-Share-Connection"] = this.getShareConnection();
        headers["X-Zx-Io-Remote-ApplicationName"] = qx.core.Environment.get("qx.compiler.applicationName");
        if (firstRequest) {
          headers["X-Zx-Io-Remote-FirstRequest"] = true;
        }
        if (qx.core.Environment.get("zx.io.remote.BrowserXhrEndpoint.sessionTracing")) {
          if (!this.__requestIndex) {
            this.__requestIndex = 0;
          }
          headers["X-Zx-Io-Remote-RequestIndex"] = this.__requestIndex++;
        }
        Object.keys(headers).forEach(key => {
          req.setRequestHeader(key, headers[key]);
          if (qx.core.Environment.get("zx.io.remote.BrowserXhrEndpoint.sessionTracing")) {
            this.debug(`Header: ${key} = ${headers[key]}`);
          }
        });

        req.addListener("success", onSuccess);
        req.addListener("fail", onFailure);
        req.addListener("timeout", onFailure);

        req.setRequestData(bodyAsString);
        return req;
      };

      req = createRequest();

      req.send();
    },

    /**
     * Returns the URL for upload widgets
     *
     * @returns {String}
     */
    getUploadUrl() {
      return this.__url;
    }
  }
});
