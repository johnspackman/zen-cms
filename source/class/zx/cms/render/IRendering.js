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

/**
 * Instances of IRendering are a way to wrap up the copnversation between the client and the server,
 * the most common example of which would be a wrapper for ExpressJS Request & Response, where the
 * IRendering makes the headers and query parameters available and is given the data to send back.
 *
 * The other examples are a static site generator or the unit test runner, both of which need to create
 * renderings of the URL and then analyse the output data in some way (eg write to a disk file or check the
 * content)
 */
qx.Interface.define("zx.cms.render.IRendering", {
  members: {
    /**
     * Called to get the host name for the request
     *
     * @return {String}
     */
    getHostName() {},

    /**
     * Called to get a header value; `name` is case insensitive
     *
     * @param name {String} the name of the header to get
     * @return {String?} the value, or null
     */
    getHeader(name) {},

    /**
     * Called to get the query parameters as a map
     *
     * @return {Map<String, String>}
     */
    getQuery() {},

    /**
     * Gets the User object
     *
     * @return {zx.server.auth.User}
     */
    async getUser() {},

    /**
     * Called to set the error status for the request; the error codes are standard HTTP
     * error codes.
     *
     * @param errorCode {Integer} the error code
     * @param message {String?} optional error message
     */
    async setStatus(statusCode, message) {},

    /**
     * Sets a response header value
     *
     * @param key {String} the heasder value name
     * @param value {String?} the header value, or null if the current value is to be deleted
     */
    setResponseHeader(key, value) {},

    /**
     * Sends a response; follows the semantics of Fastify `reply.send` with regards to content type
     *
     * @param body {String|Buffer|Object|Array}
     */
    async send(body) {},

    /**
     * Sends a file as the response; follows the semantics of Fastify `reply.sendFile`
     *
     * @param filename {String}
     * @param options {Map?}
     */
    async sendFile(filename, options) {},

    /**
     * Called to abort rendering and prevent any further output
     */
    stop() {},

    /**
     * Called to detect if `stop()` was called
     *
     * @return {Boolean}
     */
    isStopped() {}
  }
});
