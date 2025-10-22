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
 * Tagging interface for the POJO that will be sent as a request from a client transport to a server transport
 */
qx.Interface.define("zx.io.api.IRequestJson", {
  members: {
    /**
     * @type {"callMethod" | "subscribe" | "poll" | "unsubscribe"}
     */
    type: "",

    /**
     * @type {string} The path of the API method to call
     */
    path: "",

    /**
     * NB: This object is empty when the request is a poll.
     * It's a string if we want to encrypt it.
     *
     * @interface ICallMethod @extends {IBody}
     * @property {any[]} methodArgs
     *
     * @interface ISubscribe @extends {IBody}
     * @property {string} eventName
     *
     * @typedef {ICallMethod | ISubscribe | {}} IBody
     *
     * @type {IBody | string}
     */
    body: {},

    /**
     * @type {zx.io.api.IHeaders}
     */
    headers: {}
  }
});
