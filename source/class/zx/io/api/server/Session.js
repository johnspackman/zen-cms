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
*    Patryk Malinowski (@p9malino26)
*    John Spackman (john.spackman@zenesis.com, @johnspackman)
*
* ************************************************************************ */



/**
 * Sessions keep track of clients connected to the server
 * and the events they are subscribed to.
 * Sessions are specific to a transport in a client and no more specific than this.
 *
 * When a client API subscribes to an event,
 * a session for that client is created if it doesn't exist yet
 * and the session takes note of the subscription of the event to that API.
 *
 * Sessions must be kept active; the client must send a message to the server to keep its session active.
 * Sessions which have been inactive to too long are killed to prevent resource leaks.
 * This is the responsibility of the SessionManager (zx.io.api.server.SessionManager)
 */
qx.Class.define("zx.io.api.server.Session", {
  extend: qx.core.Object,

  /**
   * @param {zx.io.api.server.AbstractServerTransport} transport
   */
  construct(transport) {
    super();
    this.__transport = transport;
    this.__subscriptions = {};
    this.__publicationsQueue = new qx.data.Array();
  },

  properties: {
    /**
     * The last time the client associated with this session sent a message to the server
     */
    lastActivity: {
      check: "Date",
      nullable: true,
      init: new Date()
    }
  },

  members: {
    /**
     * @type {zx.io.api.server.AbstractServerTransport}
     */
    __transport: null,

    /**
     * Information about the subscriptions of each API for this session
     * @typedef {[eventName: string]: number} CountsPerEvent The number of subscriptions to each event for this API
     * @typedef {countPerEvent: CountsPerEvent, clientApiUuid: string} ApiInfo
     * @type {[serverApiUuid: string]: ApiInfo}
     */
    __subscriptions: null,

    /**
     * @type {qx.data.Array<zx.io.api.IResponseJson.IPublish>}
     */
    __publicationsQueue: null,

    /**
     * @returns {zx.io.api.server.AbstractServerTransport}
     */
    getTransport() {
      return this.__transport;
    },

    /**
     * Called EXCLUSIVELY by the session manager (zx.io.api.server.SessionManager) when the session is killed
     * due to inactivity timeout
     */
    kill() {
      zx.io.api.server.SessionManager.getInstance().removeSession(this);
      this.__subscriptions = null;
      this.__publicationsQueue = null;
    },

    /**
     * Gets the UUID of the client API that corresponds to the given server API
     * @param {zx.io.api.server.AbstractServerApi} api
     * @returns {string} UUID of zx.io.api.client.AbstractClientApi
     */
    getClientApiUuid(api) {
      return this.__subscriptions[api.toUuid()]?.clientApiUuid;
    },

    /**
     * Creates a subscription to a publication fired by the server API
     *
     * @param {zx.io.api.server.AbstractServerApi} api
     * @param {string} clientApiUuid UUID of zx.io.api.client.AbstractClientApi
     * @param {string} eventName
     */
    addSubscription(api, clientApiUuid, eventName) {
      this.__subscriptions[api.toUuid()] ??= {
        clientApiUuid: clientApiUuid, //
        apiName: api.getApiName(),
        countPerEvent: {}
      };
      let apiInfo = this.__subscriptions[api.toUuid()];
      apiInfo.countPerEvent[eventName] ??= 0;
      apiInfo.countPerEvent[eventName]++;
    },

    /**
     * @param {zx.io.api.server.AbstractServerApi} api
     * @param {string} eventName
     */
    removeSubscription(api, eventName) {
      let apiInfo = this.__subscriptions[api.toUuid()];
      if (!apiInfo) {
        this.warn("No subscriptions for this API " + api.getApiName());
      }
      let eventSubscription = apiInfo.countPerEvent[eventName];
      if (eventSubscription === undefined) {
        this.warn("No subscriptions for this API " + api.getApiName() + " for event " + eventName);
      }
      apiInfo.countPerEvent[eventName]--;
      if (eventSubscription === 0) {
        delete apiInfo[eventName];
      } else {
        apiInfo[eventName] = apiInfo;
      }
    },

    /**
     * Called EXCLUSIVELY by zx.io.api.server.AbstractServerApi
     * when we want to publish a subscribed client of a particular event
     * @param {zx.io.api.server.AbstractServerApi} api
     * @param {string} eventName
     * @param {*} data
     * @returns
     */
    publish(api, eventName, data) {
      let apiInfo = this.__subscriptions[api.toUuid()];
      if (!apiInfo) {
        this.warn(this.toUuid(), "no apiInfo");
        return;
      }
      let { clientApiUuid, countPerEvent } = apiInfo;

      let subscriptionCount = countPerEvent[eventName];
      if (!subscriptionCount) {
        this.warn(this.toUuid(), "no subscriptionCount");
        return;
      }

      let headers = {
        "Api-Name": api.getApiName(),
        "Server-Api-Uuid": api.toUuid(),
        "Client-Api-Uuid": clientApiUuid,
        "Session-Uuid": this.toUuid()
      };

      let message = {
        type: "publish",
        headers,
        body: {
          eventName: eventName,
          eventData: data
        }
      };

      this.__publicationsQueue.push(message);
      if (this.__transport.supportsServerPush()) {
        zx.io.api.server.ConnectionManager.getInstance().flushPublicationsQueue(this);
      }
    },

    /**
     * Removes and returns all publications from the queue, for all APIs
     * @returns {zx.io.api.IResponseJson[]}
     */
    consumePublicationsQueue() {
      let out = this.__publicationsQueue.toArray();
      this.__publicationsQueue = new qx.data.Array();
      return out;
    },

    /**
     * Called exclusively by zx.server.SessionManager when it detects that this session has been inactive for too long
     */
    destroy() {
      //nothing yet
    }
  }
});
