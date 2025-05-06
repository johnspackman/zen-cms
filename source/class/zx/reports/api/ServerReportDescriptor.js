qx.Class.define("zx.reports.api.ServerReportDescriptor", {
  extend: qx.core.Object,
  implement: [zx.reports.api.IReportExecutor],

  construct(id, title, formats, reportRunner, createDatasource) {
    super();
    this.setId(id);
    this.setName(title);
    this.setFormats(formats);
    this.__reportRunner = reportRunner;
    this.__createDatasourceFn = createDatasource;
    this.__serverApi = zx.io.api.ApiUtils.createServerApi(zx.reports.api.IReportExecutor, this);
  },

  destruct() {
    this.__serverApi.dispose();
    this.__serverApi = null;
  },

  properties: {
    id: {
      check: "String",
      event: "changeId"
    },

    name: {
      check: "String",
      event: "changeName"
    },

    formats: {
      check: "Array",
      event: "changeFormats"
    },

    params: {
      init: null,
      check: "Object",
      event: "changeParams",
      nullable: true,
      apply: "_applyParams",
      async: true
    }
  },

  members: {
    /** @type{Function} creates the datasource for a given set of parameters */
    __createDatasourceFn: null,

    /** @type{zx.reports.ReportRunner} the report runner */
    __reportRunner: null,

    /** @type{zx.report.IDatasource} the datasource */
    __datasource: null,

    /** @type{zx.io.api.server.AbstractServerApi} */
    __serverApi: null,

    /**
     * Apply for `params` property
     */
    async _applyParams(value, oldValue) {
      this.__datasource = await this.__createDatasourceFn(value);
    },

    getServerApi() {
      return this.__serverApi;
    },

    setRootElement(rootElement) {
      this.__reportRunner.setRootElement(rootElement);
    },

    /**
     * @Override
     */
    execute(format) {
      if (!this.getFormats().includes(format)) {
        throw new Error("Invalid format: " + format);
      }
      this.__reportRunner.getIterator().setDatasource(this.__datasource);
      if (format === "html") {
        this.__reportRunner.run();
      } else if (format === "csv") {
        throw new Error("CSV format is not supported yet");
      } else {
        throw new Error("Unsupported format: " + format);
      }
    },

    /**
     * @Override
     */
    triggerPrintDialog() {
      document.execCommand("print", false, null);
    },

    /**
     * @Override
     */
    triggerSaveAsCsvDialog() {
      throw new Error("CSV format is not supported yet");
    },

    /**
     * @Override
     */
    getDrilldown() {
      return this.__reportRunner.getIterator().getDrilldown();
    },

    /**
     * @Override
     */
    setGroupFilters(groupFilters) {
      this.__reportRunner.getIterator().setGroupFilters(groupFilters);
    }
  }
});
