qx.Class.define("zx.ui.utils.progress.Popup", {
  extend: qx.ui.core.Widget,
  type: "singleton",

  construct() {
    super();
    this._setLayout(new qx.ui.layout.VBox(5));
    this._add(this.getChildControl("messages"));
    this._add(this.getChildControl("pole"));
    this.set({
      width: 440
    });

    this.setVisibility("excluded");
    this.__hideTimeout = new zx.utils.Timeout(250, this.hideNow, this);
    this.addListener("changeVisibility", this.__onChangeVisibility, this);
    this.__tasks = new qx.data.Array();

    var root = qx.core.Init.getApplication().getDocumentRoot();
    root.add(this);
  },

  properties: {
    appearance: {
      refine: true,
      init: "progress"
    },

    /**
     * Whether to block the UI while the widget is displayed
     */
    useBlocker: {
      check: "Boolean",
      init: true
    },

    /**
     * The blocker's color
     */
    blockerColor: {
      check: "String",
      init: "black"
    },

    /**
     * The blocker's opacity
     */
    blockerOpacity: {
      check: "Number",
      init: 0.25
    }
  },

  members: {
    __tasks: null,
    __blocker: null,
    __hideTimeout: null,

    __onChangeVisibility(evt) {
      if (evt.getData() == "visible") {
        if (this.isUseBlocker()) {
          var root = qx.core.Init.getApplication().getRoot();

          // Create it
          if (!this.__blocker) {
            this.__blocker = new qx.ui.core.Blocker(root);
            this.__blocker.setOpacity(this.getBlockerOpacity());
            this.__blocker.setColor(this.getBlockerColor());
          }

          // make sure the popup is above any opened window
          var maxWindowZIndex = root.getZIndex();
          var windows = root.getWindows();
          for (var i = 0; i < windows.length; i++) {
            var zIndex = windows[i].getZIndex();
            maxWindowZIndex = Math.max(maxWindowZIndex, zIndex);
          }
          maxWindowZIndex = Math.max(maxWindowZIndex, 200000);
          this.setZIndex(maxWindowZIndex + 2);
          this.__blocker.blockContent(maxWindowZIndex + 1);
        }

        var parent = this.getLayoutParent();
        if (parent) {
          var bounds = parent.getBounds();
          if (bounds) {
            var hint = this.getSizeHint();

            var left = Math.round((bounds.width - hint.width) / 2);
            var top = Math.round((bounds.height - hint.height) / 2);

            if (top < 0) {
              top = 0;
            }

            this.setLayoutProperties({
              left: left,
              top: top
            });
          }
        }
      } else {
        if (!this.__blocker) {
          return;
        }
        this.__blocker.unblock();

        if (this.__previousFocus) {
          try {
            this.__previousFocus.focus();
          } catch (e) {}
          this.__previousFocus = null;
        }
      }
    },

    /**
     * Adds a task
     * @param {String} label the message to appear on screen
     * @param {String?} icon the icon
     * @param {Integer?} delay optional timeout before the task is added
     * @return {Task} the task object
     */
    addTask(label, icon, delay = 0) {
      for (var i = 0; i < this.__tasks.getLength(); i++) {
        var task = this.__tasks.getItem(i);
        if (task.getLabel() == label) {
          task.addRef();
          return task;
        }
      }
      var task = new zx.ui.utils.progress.Task(label, icon);
      task.addRef();
      task.addListenerOnce("released", this.__onReleaseTask, this);

      let timeout = undefined;
      task.addListenerOnce("released", () => timeout !== undefined && clearTimeout(timeout));
      const installTask = () => {
        this.getChildControl("messages").add(task);
        this.__tasks.push(task);
        this.show();
      };
      if (delay == 0) {
        installTask();
      } else {
        timeout = setTimeout(installTask, delay);
      }
      return task;
    },

    /**
     * Event handler for when the task has completed
     */
    __onReleaseTask(evt) {
      var task = evt.getTarget();
      if (this.__tasks.contains(task)) {
        this.__removeTask(task);
      }
    },

    /**
     * Removes the specified task
     */
    __removeTask(task) {
      this.__tasks.remove(task);
      this.getChildControl("messages").remove(task);
      if (this.__tasks.getLength() == 0) {
        this.setVisibility("excluded");
      }
    },

    /**
     * Clears all tasks from the display
     */
    clearAllTasks() {
      while (this.__tasks.getLength()) {
        var task = this.__tasks.getItem(0);
        this.__removeTask(task);
      }
    },

    /**
     * Shows the progress popup on screen, above all other windows
     */
    show() {
      this.__hideTimeout.killTimer();
      if (!this.__previousFocus && this.getVisibility() != "visible") {
        var widget = qx.ui.core.FocusHandler.getInstance().getActiveWidget();
        if (widget && widget.isFocusable()) {
          this.__previousFocus = widget;
        }
      }
      this.setVisibility("visible");
    },

    /**
     * Hides the popup, but only after the smoothing timeout applies
     */
    hide() {
      this.__hideTimeout.resetTimer();
    },

    /**
     * Hides the popup
     */
    hideNow() {
      this.setVisibility("excluded");
    },

    /*
     * @Override
     */
    _createChildControlImpl(id) {
      switch (id) {
        case "messages":
          return new qx.ui.container.Composite(new qx.ui.layout.VBox(2).set({ alignX: "center" }));

        case "pole":
          return new qx.ui.basic.Image().set({
            alignX: "center"
          });
      }
    }
  }
});
