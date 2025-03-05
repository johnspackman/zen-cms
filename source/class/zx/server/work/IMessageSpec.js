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
 *    John Spackman (@johnspackman)
 *    Will Johnson (@willsterjohnsonatzenesis)
 *
 * ************************************************************************ */

/**
 * This tagging interface represents the shape of the POJO used to specify a work message
 *
 * (not to be confused with a similarly named mobile messaging app)
 */
qx.Interface.define("zx.server.work.IMessageSpec", {
  members: {
    /** @type {string} the uuid of the caller */
    caller: null,

    /** @type {string} the message detail */
    message: null,

    /** @type {"log" | "success" | "failure"} the kind of the message */
    kind: null,

    /** @type {number} the timestamp at which the message was created */
    time: null
  }
});
