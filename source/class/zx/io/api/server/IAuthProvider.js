qx.Interface.define("zx.io.api.server.IAuthProvider", {
  members: {
    /**
     * Checks whether we have permission to use the given API
     * @param {string} apiName
     */
    canUseApi(apiName) {}
  }
});
