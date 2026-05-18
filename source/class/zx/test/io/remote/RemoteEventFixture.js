/* ************************************************************************
 *
 *  Zen [and the art of] CMS
 *
 *  https://zenesis.com
 *
 *  License: MIT (see LICENSE in project root)
 *
 * ************************************************************************ */

/**
 * Fixture used by TestRemoteEvents — minimal IObject with a single
 * annotated remote event and one unannotated event for negative tests.
 */
qx.Class.define("zx.test.io.remote.RemoteEventFixture", {
  extend: zx.io.persistence.Object,
  implement: [zx.io.remote.IProxied],
  "@": [zx.io.persistence.anno.Class.DEFAULT, zx.io.remote.anno.Class.NOPROXY],

  events: {
    /** Annotated — propagated to the remote side */
    dataReady: "qx.event.type.Data",

    /** Not annotated — must NOT propagate */
    silent: "qx.event.type.Data"
  },

  members: {
    "@dataReady": zx.io.remote.anno.Event.DEFAULT
  }
});
