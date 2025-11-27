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
 *    Patryk Malinowski (@patryk-m-malinowski)
 *    John Spackman (john.spackman@zenesis.com, @johnspackman)
 *
 * ************************************************************************ */

/**
 * Tagging interface for the headers POJO that is sent with every request and response
 */
qx.Interface.define("zx.io.api.IHeaders", {
  members: {
    /**
     * @type {number}
     * An ID for a method call
     * Used for requests of type "callMethod" and responses of type "methodReturn"
     */
    "Call-Index": 0,

    /**
     * Name of the API
     * Null for poll requests/responses
     */
    "Api-Name": "",

    /**
     * UUID of the instance of client API (subclass of zx.io.api.client.AbstractClientApi) related to the request/response
     */
    "Client-Api-Uuid": "",

    /**
     * Only present in responses or publications
     * UUID of the instance of server API (subclass of zx.io.api.client.AbstractServerApi) related to the response or publication
     */
    "Server-Api-Uuid": "",

    /**
     * @type {Object}
     */
    Cookies: {},

    /**
     * UUID of the session (zx.io.api.server.Session) related to the request/response
     */
    "Session-Uuid": ""
  }
});
