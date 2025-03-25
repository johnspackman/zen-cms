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
*    John Spackman (john.spackman@zenesis.com, @johnspackman)
*
* ************************************************************************ */

const fs = require("fs");

qx.Class.define("zx.server.puppeteer.PuppeteerApi", {
  extend: zx.server.rest.RestApiServer,

  construct() {
    super();
  },

  members: {
    /**
     * @param {import("fastify").FastifyRequest} req
     * @param {import("fastify").FastifyReply} rep
     */
    async _httpGetHello(req, rep) {
      this.debug("GET hello requested");
      rep.code(200).send({ status: "ok", result: { hello: "world" } });
    },

    /**
     * @param {import("fastify").FastifyRequest} req
     * @param {import("fastify").FastifyReply} rep
     */
    async _httpGetShutdown(req, rep) {
      this.debug("Shutdown requested");
      await fs.promises.writeFile(".shutdown-docker", "shutdown");

      // Dont await this, as it will never return until this request has completed
      zx.server.puppeteer.WebServer.INSTANCE.stop();
      rep.code(200).send({ status: "ok" });
    }
  }
});
