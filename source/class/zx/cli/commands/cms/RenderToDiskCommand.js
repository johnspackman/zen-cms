const fs = require("fs-extra");
const path = require("path");
qx.Class.define("zx.cli.commands.cms.RenderToDiskCommand", {
  extend: zx.cli.Command,
  construct() {
    super("render-to-disk", "Renders a zx.cms.content.Page to disk");
    this.addArgument(
      new zx.cli.Argument("args").set({
        type: "string",
        array: true,
        required: true,
        description: "The URLs of the pages to render, followed by the output directory as the last argument"
      })
    );
  },
  members: {
    async _runImpl() {
      let { args } = this.getValues();
      let outDir = args.args.pop();
      let urls = args.args;
      let server = new zx.server.Standalone();
      await server.start();
      let renderer = server.getRenderer();

      let dependencies = {};

      for (let url of urls) {
        let htmlPath = path.join(outDir, url.substring("pages/".length) + ".html");
        await fs.mkdir(path.dirname(htmlPath), { recursive: true });
        let rendering = new zx.cms.render.DiskRendering(htmlPath);
        let viewable = await server.getObjectByUrl(zx.cms.content.Page, url);
        let info = await renderer.renderViewable(rendering, viewable);
        Object.assign(dependencies, info.dependencies);
        await rendering.waitForAll();
      }

      this.debug("Copying dependencies to output directory");
      for (let [clientPath, absPath] of Object.entries(dependencies)) {
        let outPath = path.join(outDir, clientPath);
        await fs.mkdir(path.dirname(outPath), { recursive: true });
        await fs.copyFile(absPath, outPath);
      }
      this.debug("Stopping server");
      await server.stop();
      return 0;
    }
  }
});
