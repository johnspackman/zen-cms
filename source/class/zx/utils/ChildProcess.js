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

const child_process = require("child_process");

qx.Class.define("zx.utils.ChildProcess", {
  extend: qx.core.Object,

  statics: {
    /**
     * Runs the given command and returns an object containing information on the
     * `exitCode`, the `output`, potential `error`s, and additional `messages`.
     * @typedef {(msg: string, output: string) => void} Logger Callback for the console output
     * @param {Map} opts options, containing:
     *    cmd {String|String[]} command and arguments
     *    cwd {String} The current working directory
     *    onConsole {{log: Logger} | Logger} callback for the console output
     *    copyToConsole {Boolean?} if true, console output is copied to this process' console
     *    mergeOutput {Boolean?} if true, stderr is merged into stdout (this is the default)
     *
     * @return {Promise<Map>}:
     *    exitCode {Number}
     *    output: {String}
     *    error: *
     *    messages: *
     */
    async runCommand(opts) {
      return new Promise((resolve, reject) => {
        let cmd;
        let args;
        if (typeof opts.cmd == "string") {
          cmd = opts.cmd;
          args = [];
        } else if (qx.lang.Type.isArray(opts.cmd)) {
          args = qx.lang.Array.clone(opts.cmd);
          cmd = args.shift();
        }
        let spawnArgs = {
          shell: true
        };

        if (opts.cwd) {
          spawnArgs.cwd = opts.cwd;
        }
        let proc = child_process.spawn(cmd, args, spawnArgs);
        let result = {
          exitCode: null,
          output: "",
          error: "",
          messages: null
        };

        let log = opts.onConsole ? opts.onConsole.log ?? opts.onConsole : null;

        function onStdout(data) {
          data = data.toString();
          if (opts.copyToConsole) {
            console.log(data);
          }
          result.output += data;

          if (opts.onConsole) {
            log(data, "stdout");
          }
        }
        function onStderr(data) {
          data = data.toString();
          if (opts.copyToConsole) {
            console.error(data);
          }
          result.error += data;
          if (opts.onConsole) {
            log(data, "stderr");
          }
        }
        proc.stdout.on("data", onStdout);
        proc.stderr.on("data", opts.mergeOutput === false ? onStderr : onStdout);

        proc.on("close", code => {
          result.exitCode = code;
          if (code === 0) {
            resolve(result);
          } else {
            reject(result);
          }
        });
        proc.on("error", err => {
          reject(err);
        });
      });
    }
  }
});
