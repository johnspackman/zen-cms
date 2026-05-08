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

/**
 * @require(qx.core.Init)
 * @ignore(process)
 * @ignore(require)
 */

qx.Class.define("zx.test.NodeUnitTestsApp", {
  extend: qx.application.Basic,

  members: {
    async main() {
      qx.log.Logger.register(zx.utils.NativeLogger);
      if (qx.core.Environment.get("qx.debug")) {
        qx.log.appender.Native;
      }

      // These test classes come from qx/**/TestRunnerApp.class

      zx.test.TestRunner.runAll(zx.test.cli.TestCli);
      zx.test.TestRunner.runAll(zx.test.io.persistence.TestPersistence);
      zx.test.TestRunner.runAll(zx.test.io.persistence.TestImportExport);
      zx.test.TestRunner.runAll(zx.test.io.persistence.TestNedbDatabase);
      zx.test.TestRunner.runAll(zx.test.io.remote.TestPropertyChanges);
      zx.test.TestRunner.runAll(zx.test.io.remote.TestRemoteEvents);
      zx.test.TestRunner.runAll(zx.test.cms.TestTemplates, ["testCms"]);
    }
  }
});
