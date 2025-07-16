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
 *    John Spackman (john.spackman@zenesis.com, @johnspackman)
 *
 * ************************************************************************ */

const fs = require("fs");
const path = require("path");
const child_process = require("child_process");

qx.Class.define("zx.server.work.pools.NodeProcessWorkerTracker", {
  extend: zx.server.work.WorkerTracker,

  construct(workerPool) {
    super(workerPool, null);
  },

  destruct() {
    this.__apiClientTransport.dispose();
    this.__apiClientTransport = null;
    if (this.__containerWatcher) {
      this.__containerWatcher.dispose();
      this.__containerWatcher = null;
    }
    if (this.__processConsoleLog) {
      this.__processConsoleLog.dispose();
      this.__processConsoleLog = null;
    }
  },

  events: {
    containerShutdown: "qx.event.type.Event"
  },

  members: {
    /** @type {child_process} the child process */
    __nodeProcess: null,

    /** @type {Integer} the port that the node process will be listening to for debugging */
    __nodeDebugPort: null,

    /** @type {zx.io.api.transport.AbstractClientTransport} the transport used for API calls */
    __apiClientTransport: null,

    /** @type {zx.utils.IncrementalLogWriter} where to log the process console output */
    __processConsoleLog: null,

    /** @type {Integer} port that the node server in the container is available from, when the Worker node process runs on the host */
    __containerNodePort: null,

    /**
     * @override
     */
    async initialize() {
      let workerPool = this.getWorkerPool();

      let readySignal = null;
      if (workerPool.getNodeLocation() == "container") {
        readySignal = "zx.server.work.WORKER_READY_SIGNAL";
      }
      let clientApiMounts = workerPool.getDataMounts();

      /*
       * If the Worker in on the host, then:
       *    Worker HTTP (for API):              10000  [nodeHttpPort]
       *    Worker Node Debug:                  9229   [nodeDebugPort]
       *    Puppeteer Server (from Container):  11000  [chromiumPort]
       *    Chromium (from Container):          11000 (proxied by Puppeteer Server)
       *    Puppeteer Server Node Debug:        9230   [chromiumDebugPort]
       *
       * If the Worker is in a Container, then:
       *    Worker HTTP (for API):              10000  [nodeHttpPort]
       *    Worker Node Debug (from Container): 9229   [nodeDebugPort]
       *    Chromium (from Container):          11000  [chromiumPort]
       */

      if (workerPool.getNodeLocation() == "container" || workerPool.isEnableChromium()) {
        let inspect = workerPool.getNodeInspect();
        await this._createDockerConfiguration(
          workerPool.getNodeLocation(),
          inspect,
          dockerConfig => {
            if (workerPool.getNodeLocation() == "container") {
              let chromiumUrl = null;
              if (workerPool.isEnableChromium()) {
                chromiumUrl = `http://localhost:11000`;
              }

              let nodeCmd = workerPool.getFullNodeProcessCommandLine(10000, inspect, inspect != "none" ? 9229 : null);
              nodeCmd[0] = path.join("runtime", nodeCmd[0]);

              dockerConfig.Env.ZX_NODE_ARGS = nodeCmd.join(" ");
              dockerConfig.Env.ZX_MODE = "worker";

              let dataMounts = workerPool.getDataMounts();
              clientApiMounts = [];
              if (dataMounts) {
                for (let dataMount of dataMounts) {
                  let pos = dataMount.indexOf(":");
                  if (pos == -1) {
                    throw new Error(`Invalid data mount: ${dataMount}`);
                  }
                  let alias = dataMount.substring(0, pos);
                  let dir = dataMount.substring(pos + 1);
                  dir = path.resolve(process.cwd(), dir);
                  dockerConfig.HostConfig.Binds.push(`${dir}:/home/pptruser/data/${alias}`);
                  clientApiMounts.push(`${alias}:/home/pptruser/data/${alias}`);
                }
              }
            }
          },
          readySignal
        );
        this._container = await this._createDockerContainer();
      }

      if (workerPool.getNodeLocation() == "host") {
        let inspect = workerPool.getNodeInspect();
        let chromiumUrl = null;
        if (workerPool.isEnableChromium()) {
          chromiumUrl = `http://localhost:${this._getChromiumPort()}`;
        }
        let nodeCmd = workerPool.getFullNodeProcessCommandLine(this._getNodeHttpPort(), inspect, inspect != "none" ? this._getNodeDebugPort() : null);

        this.debug("Running command: " + nodeCmd.join(" "));
        this.__nodeProcess = child_process.spawn("node", nodeCmd, {});

        let processDir = path.join(workerPool.getWorkDir(), "process", "" + this.__nodeProcess.pid);
        await fs.promises.mkdir(processDir, { recursive: true });
        this.__processConsoleLog = new zx.utils.IncrementalLogWriter(path.join(processDir, "console.log"));

        const onConsoleMessage = message => {
          this.__processConsoleLog.write(message + "\n");
          this.appendWorkLog(message);
        };

        // prettier-ignore
        onConsoleMessage("Starting node process: " + this.__nodeProcess.spawnfile + " " + this.__nodeProcess.spawnargs.join(" ") + "\n" +
          "  pid: " + this.__nodeProcess.pid + "\n" +
          "  pwd: " + process.cwd() + "\n" +
          "  nodeHttpPort: " + this._getNodeHttpPort() + "\n" +
          "  nodeDebugPort: " + this.__nodeDebugPort + "\n");

        let promise = new qx.Promise();
        let streams = new zx.utils.BufferedIoStreams(line => {
          if (line.toString().indexOf("zx.server.work.WORKER_READY_SIGNAL") > -1) {
            promise.resolve();
          } else {
            onConsoleMessage(line);
          }
        });
        streams.add(this.__nodeProcess.stdout, this.__nodeProcess.stderr);

        this.__nodeProcess.on("close", code => {
          let wasRunning = this.getStatus() == "running";
          this.setStatus("dead");
          if (wasRunning) {
            onConsoleMessage("Process died unexpectedly");
          }
          streams.close();
        });
        this.debug(`spawned worker process, waiting for ready signal...`);
        await promise;
        this.debug("worker process ready");
      }

      let url = `http://localhost:${this._getNodeHttpPort()}/zx-api/`;
      this.__apiClientTransport = new zx.io.api.transport.http.HttpClientTransport(url);
      let workerClientApi = zx.io.api.ApiUtils.createClientApi(zx.server.work.IWorkerApi, this.__apiClientTransport, "/work/worker");
      this._setWorkerClientApi(workerClientApi);

      if (this._container) {
        let chromiumUrl = `http://localhost:${this._getChromiumPort()}`;
        await this.getWorkerClientApi().setChromiumUrl(chromiumUrl);
        await this.getWorkerClientApi().setDataMounts(clientApiMounts);
      }

      this.debug(`worker ready`);
      await super.initialize();
    },

    /**
     * @Override
     */
    async getDockerContainer() {
      return this._container;
    },

    /**
     * @Override
     */
    async close() {
      this.debug(`Closing worker`);
      let clientApi = this.getWorkerClientApi();
      let timedWaitFor = null;
      let nodeProcessClosed = false;
      let timeout = this.getWorkerPool().getShutdownTimeout();
      if (this.__nodeProcess) {
        let pid = this.__nodeProcess.pid;
        timedWaitFor = new zx.utils.TimedWaitFor(timeout);
        this.__nodeProcess.once("close", () => {
          this.debug(`Node process ${pid} terminated`);
          nodeProcessClosed = true;
          timedWaitFor.fire();
        });
      }
      try {
        await clientApi.shutdown();
      } catch (ex) {
        // Shutdown will reject the method call, so this is actually expected
        this.trace(`Expected exception while shutting down worker: ${ex}`);
      }
      if (timedWaitFor) {
        await timedWaitFor.wait();
      }
      if (this.__nodeProcess) {
        let pid = this.__nodeProcess.pid;
        if (!nodeProcessClosed) {
          this.debug(`Killing node process ${pid}`);
          this.__nodeProcess.kill();
        }
        this.__nodeProcess = null;
      }
      await this._closeContainer();
      await clientApi.terminate();
      zx.server.PortRanges.NODE_HTTP_SERVER_API_PORT_RANGE.release(this._nodeHttpPort);
      this._nodeHttpPort = null;
      if (this.__nodeDebugPort) {
        zx.server.PortRanges.NODE_DEBUG_PORT_RANGE.release(this.__nodeDebugPort);
        this.__nodeDebugPort = null;
      }
    },

    _getNodeDebugPort() {
      if (!this.__nodeDebugPort) {
        this.__nodeDebugPort = zx.server.PortRanges.NODE_DEBUG_PORT_RANGE.acquire();
      }
      return this.__nodeDebugPort;
    }
  }
});
