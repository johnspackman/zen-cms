qx.Class.define("zx.server.auth.CreateApiTokenCommand", {
  extend: zx.cli.Command,
  construct() {
    super("create-api-token", "Creates a new API token for a user");

    this.addFlag(
      new zx.cli.Flag("username").set({
        shortCode: "u",
        description: "Username",
        type: "string"
      })
    );

    this.addFlag(
      new zx.cli.Flag("api-name").set({
        shortCode: "n",
        description: "Name of the ZX API",
        type: "string"
      })
    );
  },
  properties: {},
  objects: {},
  members: {
    /**@override */
    async run() {
      let { username, apiName } = this.getValues().flags;
      let server = new zx.server.Standalone();
      await server.start();
      let userDiscovery = server.getUserDiscovery();
      let user = await userDiscovery.getUserFromEmail(username);
      if (!user) {
        console.error(`No user found with email ${username}`);
        return 1;
      }
      if (user.getApiTokens().get(apiName)) {
        console.log(`User ${username} already has an API token for API ${apiName}`);
        return 0;
      }

      user.getApiTokens().put(apiName, qx.util.Uuid.createUuidV4());
      await user.save();
    }
  }
});
