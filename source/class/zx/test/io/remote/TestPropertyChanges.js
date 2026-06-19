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

qx.Class.define("zx.test.io.remote.TestPropertyChanges", {
  extend: qx.dev.unit.TestCase,

  members: {
    async testWatch() {
      let ctlr = new zx.io.remote.NetworkController();
      let endpoint = new zx.test.io.remote.DummyNetworkEndpoint();
      ctlr.addEndpoint(endpoint);
      await endpoint.open();

      let p1 = new zx.test.io.remote.Person().set({ name: "Peter" });
      await endpoint.put(p1);
      let uuid = p1.toUuid();

      p1.setName("Paul");
      let pcs = endpoint._getPropertyChangeStore();
      this.assertTrue(!!pcs[uuid]);
      this.assertEquals("Paul", pcs[uuid].setValue.name);

      let c1 = new zx.test.io.remote.Person().set({ name: "Rod" });
      let c2 = new zx.test.io.remote.Person().set({ name: "Jane" });
      let c3 = new zx.test.io.remote.Person().set({ name: "Freddy" });
      p1.getChildren().push(c1);
      p1.getChildren().push(c2);
      p1.getChildren().push(c3);
      await p1.getChildren().waitForPendingEvents();
      this.assertTrue(!!pcs[uuid].arrayChange);
      this.assertEquals(3, pcs[uuid].arrayChange.children.length);
      this.assertEquals(c1.toUuid(), pcs[uuid].arrayChange.children[0].added[0]._uuid);
      this.assertEquals(c2.toUuid(), pcs[uuid].arrayChange.children[1].added[0]._uuid);
      this.assertEquals(c3.toUuid(), pcs[uuid].arrayChange.children[2].added[0]._uuid);

      let values = p1.getValues();
      values.put("one", 1);
      values.put("c1", c1);
      values.put("c2", c2);
      await values.waitForPendingEvents();
      this.assertTrue(!!pcs[uuid].mapChange);
    }
  }
});
