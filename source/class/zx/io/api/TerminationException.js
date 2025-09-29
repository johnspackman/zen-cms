/**
 * This exception is thrown when a client API is terminated.
 * It's a separate class so we can easily identify this kind of exception.
 */
qx.Bootstrap.define("zx.io.api.TerminationException", {
  extend: qx.type.BaseError
});
