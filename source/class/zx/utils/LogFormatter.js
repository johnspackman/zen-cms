qx.Class.define("zx.utils.LogFormatter", {
  extend: qx.log.appender.Formatter,

  members: {
    /**
     * @Override
     */
    formatEntryObjectAndClass(entry) {
      var breakdown = this.normalizeEntryClass(entry);
      var result = "";
      if (breakdown.clazz) {
        let classname = breakdown.clazz.classname;
        let segs = classname.split(".");
        classname = segs.pop();
        classname = segs.map(seg => seg[0]).join(".") + "." + classname;
        result += classname;
      }
      if (breakdown.hash) {
        result += "[" + breakdown.hash + "]";
      }
      result += ":";
      return result;
    }
  }
});
