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
 * Tagging interface for response data POJO from the server back to the client
 */
qx.Interface.define("zx.io.api.IResponseJson", {
  members: {
    /**
     * An array of data for the response, which can be returns of method calls,
     * or subscrption acknowledgements.
     * 
     * If this response is for a client API request, data will contains IResponseData objects,
     * otherwise, if it's for a REST request, it can contain data of any type.
     *
     * @interface IResponseData
     * @property {zx.io.api.IHeaders} headers
     * @property {string} type
     * @property {Object} body
     *
     * @interface IMethodReturn @extends IResponseData
     * @property {"methodReturn"} type
     * @property {{methodResult: any, error: string}} body
     * @property {{"Call-Index": number}} headers
     *
     * @interface IPublish @extends IResponseData
     * @property {"publish"} type
     * @property {{eventName: string, eventData: any}} body
     *
     * @interface ISubscribed @extends IResponseData
     * @property {"subscribed"} type
     * @property {{eventName: string}} body
     *
     * @interface IUnsubscribed @extends IResponseData
     * @property {"unsubscribed"} type
     * @property {{eventName: string}} body
     *
     * @interface IShutdown @extends IResponseData
     * @property {"shutdown"} type

     * @type {(IResponseData)[]}
     */
    data: [],

    /**
     * @type {string?}
     * General error. This is much lower level than inside the server API method.
     * Examples are: Proxy server exception, etc
     */
    error: ""
  }
});
