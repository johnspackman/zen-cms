/**
 * Allows return Async Iterators on the server to be proxied on the client.
 * Implements the async iterator protocol (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols#the_iterator_protocol).
 */
qx.Class.define("zx.server.RemoteIterator", {
  extend: zx.server.Object,
  include: [zx.server.MRemoteIterator],
  "@": new zx.io.remote.anno.Class().set({
    clientMixins: "zx.server.MRemoteIterator"
  }),

  /**
   *
   * @param {AsyncIterator} iterator The iterator to wrap.
   */
  construct(iterator) {
    super();
    this.__iterator = iterator;
  },

  members: {
    /**
     * @type {AsyncIterator}
     */
    __iterator: null,

    /**
     * Calls the next method of the iterator and returns the result.
     *
     * @return {Object}
     */
    "@next": zx.io.remote.anno.Method.DEFAULT,
    async next() {
      return await this.__iterator.next();
    }
  }
});
