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
 * Model class representing a response to a request to the server,
 * They are created by the transport class when a message is received from the client
 */
qx.Class.define("zx.io.api.server.Response", {
  extend: qx.core.Object,
  /**
   *
   * @param {zx.io.api.server.Request?} request
   */
  construct(request = null) {
    super();
    this.__data = [];
    this.setHeaders({});
    this.setRequest(request);
  },
  properties: {
    /**
     * @readonly
     * The request that this response is for.
     * Null if this response is not for a request (e.g. a server push)
     */
    request: {
      check: "zx.io.api.server.Request",
      init: null,
      nullable: true
    },
    /**
     * public readonly
     * @type {zx.io.api.IHeaders}
     */
    headers: {
      check: "Object"
    },

    /**
     * Any error message that occurred while processing the request
     */
    error: {
      check: "String",
      init: null,
      nullable: true
    }
  },
  members: {
    /**
     * The data items of this response
     * @type {zx.io.api.IResponseJson.IResponseData[]}
     */
    __data: null,

    /**
     *
     * @returns {zx.io.api.IResponseJson.IResponseData[]}
     */
    getData() {
      return this.__data;
    },

    /**
     *
     * @param {zx.io.api.IResponseJson.IResponseData} data
     */
    addData(data) {
      this.__data.push(data);
    },

    addHeader(key, value) {
      this.getHeaders()[key] = value;
    },

    addHeaders(headers) {
      for (let key in headers) {
        this.addHeader(key, headers[key]);
      }
    },

    /**
     * @returns {zx.io.api.IResponseJson | Object} A native object representing the data of this response
     
     */
    toNativeObject() {
      //If the request is from REST (i.e. not from a client API),
      // we will only have one data item, so we return that directly
      // If the request is from a client API, we return an object with a data property
      // containing the data items
      // This is because the client API can have multiple data items
      // (e.g. publications), while REST requests can only have one data item
      if (this.getRequest() && !this.getRequest().isFromClientApi()) {
        return this.__data[0];
      } else {
        return {
          data: this.__data
        };
      }
    }
  }
});
