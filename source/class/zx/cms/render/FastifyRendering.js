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
 * Simple wrapper for Fastify that implements IRendering
 */
qx.Class.define("zx.cms.render.FastifyRendering", {
  extend: zx.cms.render.AbstractRendering,

  construct(req, reply) {
    super();
    this.__req = req;
    this.__reply = reply;
  },

  members: {
    __req: null,
    __reply: null,
    __statusCode: null,

    /**
     * @Override
     */
    getHostName() {
      return this.__req.hostname;
    },

    /*
     * @Override
     */
    getHeader(name) {
      return this.__req.headers[name];
    },

    /*
     * @Override
     */
    getQuery() {
      return this.__req.query;
    },

    /*
     * @Override
     */
    async getUser() {
      let user = await zx.server.auth.User.getUserFromSession(this.__req);
      return user;
    },

    /*
     * @Override
     */
    async setStatus(statusCode, message) {
      this.__reply.code(statusCode);
      this.__statusCode = statusCode;
      if (message) {
        await this.__reply.send(message);
      }
    },

    /*
     * @Override
     */
    setResponseHeader(key, value) {
      this.__reply.header(key, value);
    },

    /*
     * @Override
     */
    async send(body) {
      if (!this.__statusCode) {
        this.__reply.code(200);
      }
      await this.__reply.type("text/html; charset=utf-8").send(body);
    },

    /*
     * @Override
     */
    async sendFile(filename, options) {
      await this.__reply.sendFile(filename, options);
    },

    /**
     * Returns the underlying request
     *
     * @returns {import("fastify").FastifyRequest}
     */
    getRequest() {
      return this.__req;
    },

    /**
     * Returns the underlying reply
     *
     * @returns {import("fastify").FastifyReply}
     */
    getReply() {
      return this.__reply;
    }
  }
});
