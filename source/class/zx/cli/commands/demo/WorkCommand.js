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

qx.Class.define("zx.cli.commands.demo.WorkCommand", {
  extend: zx.cli.Command,

  construct() {
    super("work", "Utility commands for running zx.server.work.* demos");
    this.addSubcommand(new zx.cli.commands.demo.work.LocalWorkerPoolCommand());
  }
});
