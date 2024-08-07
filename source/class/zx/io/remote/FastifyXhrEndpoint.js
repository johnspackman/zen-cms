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

qx.Class.define("zx.io.remote.FastifyXhrEndpoint", {
  extend: zx.io.remote.NetworkEndpoint,

  construct(sessionId, uuid) {
    super(uuid);
    this.__sessionId = sessionId;
  },

  members: {
    /** @Override */
    _supportsPushPackets: false,

    /** @type{String} the unique session id */
    __sessionId: null,

    /*
     * @Override
     */
    getUniqueIndexId() {
      return this.__sessionId;
    },

    /**
     * Called by the FastifyXhrListener to handle the request
     *
     * @param {import("fastify").FastifyRequest} req
     * @param {import("fastify").FastifyReply} reply
     */
    async _receive(req, reply) {
      let contentType = req.headers["content-type"];
      if (req.method.toUpperCase() == "POST" && contentType && contentType.startsWith("multipart/form-data")) {
        this._uploadFile(req, reply);
      } else {
        let body = (req.body && zx.utils.Json.parseJson(req.body)) || null;
        let responses = await this._receivePackets(req, reply, body);
        // responses is POJO, and Fastify will convert to JSON
        await reply.send(responses);
      }
    }
  }
});
