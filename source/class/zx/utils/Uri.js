qx.Class.define("zx.utils.Uri", {
  type: "static",

  statics: {
    /**
     *
     * @param {string} uri
     * @returns Breaks out this URI into its components
     *
     * For example, the URI "http://www.example.com:8080/path/to/resource" would be broken out into:
     * fqdn: www.example.com
     * protocol: http
     * hostname: www.example.com:8080
     * port: 8080
     * path: /path/to/resource
     */
    breakoutUri(uri) {
      const letter = "[a-zA-Z]";
      const fqdn = `${letter}+(\.${letter}+)*`;
      const hostname = `(?<fqdn>${fqdn})(:(?<port>\\d+))?`;
      let regexStr = `((?<protocol>${letter}+):\\/\\/)?(?<hostname>${hostname})?(?<path>\\/.*)`;
      let regex = new RegExp(regexStr);
      let match = regex.exec(uri);
      return {
        fqdn: match.groups.fqdn ?? null,
        protocol: match.groups.protocol ?? null,
        hostname: match.groups.hostname ?? null,
        port: match.groups.port ?? null,
        path: match.groups.path ?? null
      };
    },

    /**
     * Joins an arbitrary number of URL paths together
     * @param {string} base
     * @param  {...string} paths
     * @returns {string}
     */
    join(base, ...paths) {
      let uri = base;
      for (let path of paths) {
        uri = uri.replace(/\/$/, "") + "/" + path.replace(/^\//, "");
      }
      return uri;
    }
  }
});
