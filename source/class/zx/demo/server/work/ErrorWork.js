qx.Class.define("zx.demo.server.work.ErrorWork", {
  extend: qx.core.Object,
  implement: zx.server.work.IWork,

  members: {
    /**
     * @override
     */
    async execute(log) {
      log("I'm about to throw an exception!");
      throw new Error("oops");
    }
  }
});
