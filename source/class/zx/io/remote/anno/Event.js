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
 * Annotation used to mark events of a remote object as propagated to the
 * other end of the connection. When the server fires such an event,
 * subscribers on the client-side proxy receive a fireEvent / fireDataEvent.
 *
 * Usage in a remote-able class:
 *
 *   qx.Class.define("my.Service", {
 *     extend: qx.core.Object,
 *     events: { dataReady: "qx.event.type.Data" },
 *     members: {
 *       "@dataReady": zx.io.remote.anno.Event.DEFAULT
 *     }
 *   });
 */
qx.Class.define("zx.io.remote.anno.Event", {
  extend: qx.core.Object,

  statics: {
    /** Default annotation instance */
    DEFAULT: null
  },

  defer(statics) {
    statics.DEFAULT = new zx.io.remote.anno.Event();
  }
});
