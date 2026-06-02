qx.Mixin.define("zx.server.MRemoteIterator", {
  construct() {
    this[Symbol.asyncIterator] = () => this;
  }
});
