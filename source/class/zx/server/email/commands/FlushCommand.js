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

/**
 * Command to flush the email queue.
 *
 * This command will attempt to send all emails in the queue, and remove the emails that have been successfully sent (if the clear-queue flag is set).
 */
qx.Class.define("zx.server.email.commands.FlushCommand", {
  extend: uk.co.spar.cli.accounts.AbstractWorkCommand,
  construct() {
    super("flush");

    this.addFlag(
      new zx.cli.Flag("clear-queue").set({
        description: "Clear queue after sending?",
        type: "boolean",
        required: false,
        value: true
      })
    );
  },

  members: {
    /**
     * @Override
     */
    async _queueWork(pool, scheduler) {
      let { args, flags } = this.getValues();

      scheduler.pushWork({
        workClassname: "zx.server.email.FlushQueue",
        uuid: qx.util.Uuid.createUuidV4(),
        clearQueue: flags.clearQueue
      });

      return 0;
    }
  }
});
