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
 */
qx.Class.define("zx.cli.commands.demo.WorkerPoolsCommand", {
  extend: zx.cli.Command,

  construct() {
    super("worker-pools", "Demos using a LocalWorkerPool with a scheduler");
    this.addFlag(
      new zx.cli.Flag("worker-location").set({
        description: "where to run the workers",
        type: "enum",
        enumValues: ["local", "node-process", "node-thread", "docker"],
        required: true
      })
    );
    this.addFlag(
      new zx.cli.Flag("chromium").set({
        description: "whether to enable chromium",
        type: "boolean",
        value: false,
        required: true
      })
    );
    this.addFlag(
      new zx.cli.Flag("pool-min-size").set({
        description: "Minimum size of the worker pool",
        type: "integer",
        value: 5,
        required: true
      })
    );
    this.addFlag(
      new zx.cli.Flag("pool-max-size").set({
        description: "Maximum size of the worker pool",
        type: "integer",
        value: 10,
        required: true
      })
    );
    this.addFlag(
      new zx.cli.Flag("clean").set({
        description: "Whether to clean the work directory",
        type: "boolean",
        value: false,
        required: true
      })
    );
    this.addFlag(
      new zx.cli.Flag("inspect").set({
        description: "whether to run the node worker process under the debugger",
        type: "enum",
        enumValues: ["none", "inspect", "inspect-brk"],
        value: "none",
        required: true
      })
    );
  },

  members: {
    async run() {
      let { flags } = this.getValues();

      let server = new zx.server.Standalone();
      await server.start();

      let pool;
      let poolConfig = {
        minSize: flags.poolMinSize,
        maxSize: flags.poolMaxSize
      };

      const cliError = message => {
        console.error(message);
        process.exit(1);
      };

      if (flags.workerLocation == "local") {
        pool = new zx.server.work.pools.LocalWorkerPool().set({
          poolConfig
        });
      } else if (flags.workerLocation == "node-thread") {
        pool = new zx.server.work.pools.NodeThreadWorkerPool(null, "./compiled/source-node/cli/index.js").set({
          poolConfig
        });
      } else {
        let settings = {
          poolConfig,
          nodeInspect: flags.inspect,
          nodeLocation: "host",
          enableChromium: flags.chromium,
          dockerMounts: []
        };

        let stat = await fs.promises.stat("./puppeteer-server/base");
        if (stat?.isDirectory()) {
          // prettier-ignore
          settings.dockerMounts.push("puppeteer-server/base/container/app:/home/pptruser/app");
          settings.dockerMounts.push("puppeteer-server/base/container/bin:/home/pptruser/bin");
        }
        if (qx.core.Environment.get("qx.debug")) {
          settings.dockerMounts.push("compiled/source-node:/home/pptruser/app/runtime");
          settings.hostNodeCommand = ["./compiled/source-node/cli/index.js", "work", "start-worker"];
        } else {
          settings.hostNodeCommand = ["./compiled/build-node/cli/index.js", "work", "start-worker"];
        }

        if (flags.workerLocation == "node-process") {
          settings.nodeLocation = "host";
        } else if (flags.workerLocation == "docker") {
          settings.nodeLocation = "container";
        } else {
          throw new Error("Unknown worker location: " + flags.workerLocation);
        }
        pool = new zx.server.work.pools.NodeProcessWorkerPool().set(settings);
      }

      pool.setDataMounts(["demodata:./temp"]);
      await pool.cleanupOldContainers();

      let scheduler = new zx.server.work.scheduler.QueueScheduler("temp/scheduler/");

      if (flags.clean) {
        await fs.promises.rm(pool.getWorkDir(), { force: true, recursive: true });
        await fs.promises.rm(scheduler.getWorkDir(), { force: true, recursive: true });
      }

      zx.io.api.server.ConnectionManager.getInstance().registerApi(scheduler.getServerApi(), "/scheduler");

      let schedulerClientApi = zx.io.api.ApiUtils.createClientApi(zx.server.work.scheduler.ISchedulerApi, zx.io.api.ApiUtils.getClientTransport(), "/scheduler");
      pool.setSchedulerApi(schedulerClientApi);

      scheduler.addListener("complete", e => {
        console.log("scheduler: complete: ", e.getData());
      });

      await pool.startup();
      await scheduler.startup();

      scheduler.pushWork({
        uuid: qx.util.Uuid.createUuidV4(),
        workClassname: zx.demo.server.work.TestWork.classname,
        compatibility: [],
        args: []
      });

      if (flags.chromium) {
        scheduler.pushWork({
          uuid: qx.util.Uuid.createUuidV4(),
          workClassname: zx.demo.server.work.TestChromiumWork.classname,
          compatibility: [],
          args: []
        });
      }

      setTimeout(() => {
        scheduler.pushWork({
          uuid: qx.util.Uuid.createUuidV4(),
          workClassname: zx.demo.server.work.ErrorWork.classname,
          compatibility: [],
          args: []
        });
        scheduler.addListener("workCompleted", async e => {
          if (scheduler.getRunningSize() + scheduler.getQueueSize() == 0) {
            console.log("All work completed");
            await pool.shutdown();
            await server.stop();
            await schedulerClientApi.terminate();
          }
        });
      }, 2000);
    }
  }
});
