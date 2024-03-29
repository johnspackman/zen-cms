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
 * Provides a browser-based implementation of zx.server.rest.RestApiClient
 */
qx.Class.define("zx.server.rest.RestApiClientBrowser", {
  extend: zx.server.rest.RestApiClient,

  members: {
    /**
     * @Override
     */
    async _callApiImpl(httpMethod, url, body, cookieStore, onSuccess, onError) {
      var xhr = new zx.io.request.Xhr(url, httpMethod).set({
        async: true,
        requestData: body === undefined ? null : body
      });

      xhr.addListenerOnce("success", evt => {
        let data = xhr.getResponse();
        onSuccess(data);
      });

      xhr.addListenerOnce("error", evt => onError());

      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.send();
    }
  }
});
