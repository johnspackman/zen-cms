/**
 * Maintains a copy of an array which is filtered and/or sorted
 */
qx.Class.define("zx.utils.FilteredArray", {
  extend: qx.core.Object,

  /**
   *
   * @param {SortMethod} sortMethod
   *
   * @callback SortMethod
   * @param {any} a
   * @param {any} b
   * @returns {number} -1, 0, or 1
   */
  construct(sortMethod) {
    super();
    this.setFiltered(new qx.data.Array());
    if (sortMethod) {
      this.setSortMethod(sortMethod);
    }
  },

  destruct() {
    this._disposeArray(this.getFiltered());
  },

  properties: {
    /** Model - this is the source array that is filtered and sorted into the filtered property */
    model: {
      init: null,
      nullable: true,
      check: "qx.data.Array",
      apply: "_applyModel",
      event: "changeModel"
    },

    /** Filtered and copied version of model; this can be changed, but not set to null */
    filtered: {
      nullable: false,
      check: "qx.data.Array",
      apply: "_applyFiltered",
      event: "changeFiltered"
    },

    /** Method called to sort */
    sortMethod: {
      init: null,
      nullable: true,
      apply: "_applyXxx"
    },

    /** Method called to filter */
    filterMethod: {
      init: null,
      nullable: true,
      apply: "_applyXxx"
    },

    /** Method called before the filter begins */
    preFilterMethod: {
      init: null,
      nullable: true
    },

    /** Method called after the filter is complete */
    postFilterMethod: {
      init: null,
      nullable: true
    }
  },

  events: {
    change: "qx.event.type.Data"
  },

  members: {
    /**
     * Updates the filtered array
     */
    update() {
      if (this.isDisposed()) {
        return;
      }
      var model = this.getModel();
      var filtered = this.getFiltered();
      if (!model || !model.getLength()) {
        filtered.removeAll();
        this.fireDataEvent("change", { type: "order" });
        return;
      }

      var clone;

      // Pre Filter
      if (this.getPreFilterMethod()) {
        this.getPreFilterMethod()();
      }

      // Filter
      if (this.getFilterMethod()) {
        clone = model.toArray().filter(this.getFilterMethod());
      } else clone = model.toArray().slice(0);

      // Post Filter
      if (this.getPostFilterMethod()) {
        this.getPostFilterMethod()(clone);
      }

      // Sort
      if (this.getSortMethod()) {
        clone.sort(this.getSortMethod());
      }

      // Update
      if (!qx.lang.Array.equals(clone, filtered.toArray())) {
        clone.splice(0, 0, 0, filtered.getLength());
        filtered.splice.apply(filtered, clone).dispose();
      }

      this.fireDataEvent("change", { type: "order" });
    },

    /**
     * Event handler for changes to the model's contents
     */
    _onModelChange(evt) {
      if (evt.getData().type != "order") {
        this.update();
      }
    },

    /**
     * Does the filter test
     */
    filter(value) {
      var fn = this.getFilterMethod();
      return fn ? fn(value) : true;
    },

    /**
     * Copies those in src that pass the filter test into dest
     */
    copyFilter(src, dest) {
      if (!src) {
        src = [];
      } else if (this.getFilterMethod()) {
        src = src.toArray().filter(this.getFilterMethod());
      } else src = src.toArray().slice(0);

      if (!qx.lang.Array.equals(src, dest.toArray())) {
        src.splice(0, 0, 0, dest.getLength());
        dest.splice.apply(dest, src).dispose();
      }
    },

    /**
     * Apply for model
     */
    _applyModel(value, oldValue) {
      if (oldValue) {
        oldValue.removeListener("change", this._onModelChange, this);
      }
      if (value) {
        value.addListener("change", this._onModelChange, this);
      }
      this.update();
    },

    /**
     * Apply for filtered
     */
    _applyFiltered(value, oldValue) {
      if (oldValue) {
        oldValue.removeListener("change", this.__onFilteredChange, this);
      }
      this.update();
      if (value) {
        value.addListener("change", this.__onFilteredChange, this);
      }
    },

    /**
     * Event handler for when the filtered is changed, passes
     */
    __onFilteredChange(evt) {
      this.fireDataEvent("change", evt.getData());
    },

    /**
     * Apply for filteredMethod, sortMethod - anything that needs to refilter the array
     */
    _applyXxx() {
      if (this.getModel() && this.getModel().getLength()) {
        this.update();
      }
    }
  }
});
