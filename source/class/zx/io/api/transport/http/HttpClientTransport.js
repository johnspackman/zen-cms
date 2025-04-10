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
 * @ignore(fetch)
 */

qx.Class.define("zx.io.api.transport.http.HttpClientTransport", {
  extend: zx.io.api.client.AbstractClientTransport,

  properties: {
    polling: {
      refine: true,
      init: true
    }
  },

  members: {
    /**
     * @param {string} path The URI to post the message to
     * @param {zx.io.api.IRequestJson} requestJson
     */
    async postMessage(path, requestJson) {
      let url = zx.utils.Uri.join(this.getServerUri() ?? "", path ?? "");

      let responseText = await fetch(url, {
        method: "POST",
        body: zx.utils.Json.stringifyJson(requestJson),
        headers: { "Content-Type": "text/plain" }
      })
        .then(r => r.text())
        .catch(err => {
          //bring those into closure for debugging ease
          path;
          url;
          throw err;
        });

      let data = zx.utils.Json.parseJson(responseText);
      this.fireDataEvent("message", data);
    }
  }
});
