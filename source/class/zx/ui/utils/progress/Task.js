qx.Class.define("zx.ui.utils.progress.Task", {
  extend: qx.ui.basic.Atom,

  construct(label, icon) {
    super(label, icon);
    this.getChildControl("label").set({ rich: true, wrap: true });
  },

  events: {
    changeReferenceCount: "qx.event.type.Data",
    released: "qx.event.type.Event"
  },

  members: {
    __refCount: 0,

    addRef() {
      var oldValue = this.__refCount;
      this.__refCount++;
      this.fireDataEvent("changeReferenceCount", this.__refCount, oldValue);
    },

    release() {
      qx.core.Assert.assertTrue(this.__refCount > 0);
      var oldValue = this.__refCount;
      this.__refCount--;
      this.fireDataEvent("changeReferenceCount", this.__refCount, oldValue);
      if (this.__refCount == 0) {
        this.fireEvent("released");
      }
    }
  }
});
