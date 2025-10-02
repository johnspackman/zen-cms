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

const fs = require("fs");

/**
 * This command will start a Worker and listen on a port for HTTP traffic for
 * API requests; this is typically run inside a Docker container, but could also be
 * run on a local machine for testing and development
 *
 * @use(zx.demo.server.work.TestWork)
 * @use(zx.demo.server.work.ErrorWork)
 * @use(zx.demo.server.work.TestChromiumWork)
 */
qx.Class.define("zx.cli.commands.work.ScheduleCommand", {
  extend: zx.cli.Command,

  construct() {
    super("start-worker");
    this.set({
      description: "Schedules Work"
    });
    this.addFlag(
      new zx.cli.Flag("class").set({
        description: "Work Class to run",
        type: "string",
        required: true
      })
    );
    this.addFlag(
      new zx.cli.Flag("json").set({
        description: "JSON that configures the work",
        type: "string",
        required: false
      })
    );
    this.addFlag(
      new zx.cli.Flag("cron").set({
        description: "CRON expression",
        type: "string",
        required: true
      })
    );
    this.addFlag(
      new zx.cli.Flag("title").set({
        description: "Title of the work",
        type: "string",
        required: false
      })
    );
    this.addFlag(
      new zx.cli.Flag("id").set({
        description: "Well Known ID of the work, if any",
        type: "string",
        required: false
      })
    );
  },

  members: {
    async run() {
      let { flags } = this.getValues();

      let server = new zx.server.Standalone();
      await server.start();
    }
  }
});
