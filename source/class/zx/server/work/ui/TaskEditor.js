qx.Class.define("zx.server.work.ui.TaskEditor", {
  extend: qx.ui.core.Widget,
  construct() {
    super();
    this.getQxObject("ctlrWorkResults");

    let ctlr = this.getQxObject("ctlrWorkResults");
    zx.utils.Target.bindEvent(this, "value.workResults", "change", () => {
      let first = ctlr.getModel().getItem(0);
      if (first) {
        ctlr.setSelection(new qx.data.Array([first]));
      }
    });

    this.__refreshTimer = new zx.utils.Timeout(2000, () => this.getValue()?.refreshWorkResults()).set({ recurring: true });

    this._setLayout(new qx.ui.layout.VBox(10));
    this._add(this.getQxObject("toolbar"));
    this._add(this.getQxObject("compInfo"));
    this._add(new qx.ui.basic.Label("Executions:"));
    this._add(this.getQxObject("edtWorkResults"));

    this._add(this.getQxObject("compEdWorkResult"), { flex: 1 });

    this.__updateUi();
  },

  properties: {
    value: {
      check: "zx.server.work.ui.model.ScheduledTask",
      nullable: true,
      event: "changeValue",
      apply: "_applyValue"
    }
  },

  objects: {
    compInfo() {
      let comp = new qx.ui.container.Composite(new qx.ui.layout.VBox());
      comp.add(new qx.ui.basic.Label("Title:"));
      comp.add(this.getQxObject("edtTitle"));
      this.bind("value.title", this.getQxObject("edtTitle"), "value");
      comp.add(new qx.ui.basic.Label("Description:"));
      comp.add(this.getQxObject("edtDescription"));
      this.bind("value.description", this.getQxObject("edtDescription"), "value");
      comp.add(new qx.ui.basic.Label("Work JSON:"));
      comp.add(this.getQxObject("edtWorkJson"));
      this.bind("value.workJson", this.getQxObject("edtWorkJson"), "value", {
        converter: value => (value ? zx.utils.Json.stringifyJson(value, null, 2) : null)
      });
      return comp;
    },
    edtTitle() {
      return new qx.ui.form.TextField().set({ readOnly: true });
    },
    edtDescription() {
      return new qx.ui.form.TextArea().set({ readOnly: true, maxWidth: 400, minHeight: 150 });
    },
    edtWorkJson() {
      return new qx.ui.form.TextArea().set({ readOnly: true, maxWidth: 400, minHeight: 150, wrap: false });
    },
    toolbar() {
      let tb = new qx.ui.toolbar.ToolBar();
      tb.add(this.getQxObject("btnQueue"));
      return tb;
    },
    btnQueue() {
      let btn = new qx.ui.toolbar.Button("Queue", "@FontAwesome/play/16");
      btn.addListener("execute", () => {
        let task = this.getValue();
        task.queue();
      });
      return btn;
    },

    edtWorkResults() {
      return new qx.ui.form.SelectBox();
    },
    ctlrWorkResults() {
      let ctlr = new qx.data.controller.List(null, this.getQxObject("edtWorkResults"), "started");
      ctlr.setLabelOptions({
        converter: (data, model) => {
          let df = new qx.util.format.DateFormat("dd/MM/yyyy HH:mm:ss");
          return df.format(data);
        }
      });
      ctlr.set({
        iconPath: "success",
        iconOptions: {
          converter: success => {
            let icon = "@FontAwesome/person-running/16";
            if (success !== null) {
              icon = success ? "@FontAwesome/check/16" : "@FontAwesome/xmark/16";
            }
            return icon;
          }
        }
      });
      this.bind("value.workResults", ctlr, "model");
      ctlr.addListener("changeSelection", this.__updateUi, this);
      return ctlr;
    },
    compEdWorkResult() {
      let comp = new qx.ui.groupbox.GroupBox("Work Result").set({ layout: new qx.ui.layout.Grow() });
      comp.add(this.getQxObject("edWorkResult"));
      return comp;
    },
    edWorkResult() {
      return new zx.server.work.ui.WorkResultEditor();
    }
  },
  members: {
    /**
     * @type {zx.utils.Timeout}
     */
    __refreshTimer: null,

    _applyValue(value, old) {
      if (old) {
        this.__refreshTimer.killTimer();
      }
      if (value) {
        this.__refreshTimer.setEnabled(true);
        this.__refreshTimer.trigger();
      }
    },
    __updateUi() {
      let selection = this.getQxObject("ctlrWorkResults").getSelection().getItem(0);
      if (selection) {
        this.getQxObject("compInfo").setVisibility("excluded");
        this.getQxObject("compEdWorkResult").setVisibility("visible");
        this.getQxObject("edWorkResult").setValue(selection);
      } else {
        this.getQxObject("compInfo").setVisibility("visible");
        this.getQxObject("compEdWorkResult").setVisibility("excluded");
        this.getQxObject("edWorkResult").setValue(null);
      }
    }
  }
});
