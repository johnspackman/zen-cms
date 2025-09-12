/* ************************************************************************
 *
 *  Zen [and the art of] CMS
 *
 *  https://zenesis.com
 *
 *  Copyright:
 *    2019-2025 Zenesis Ltd, https://www.zenesis.com
 *
 *  License:
 *    MIT (see LICENSE in project root)
 *
 *  Authors:
 *    John Spackman (john.spackman@zenesis.com, @johnspackman)
 *
 * ************************************************************************ */

/**
 * Feature for the thin client that contains a list of zx.reports.api.IReportDescriptors
 * and runs them on demand; supports the zx.reports.api.IReportDiscovery interface so that
 * this can be run in an iframe or remote Chromium and operated by the user's browser.
 *
 * @use(zx.utils.BigNumber)
 * @ignore(BigNumber)
 * @ignore(URLSearchParams)
 */
qx.Class.define("zx.reports.thin.AbstractReportRunnerFeature", {
  extend: zx.thin.ui.container.Composite,
  type: "abstract",
  implement: [zx.cms.content.IFeatureClientLifecycle, zx.reports.api.IReportDiscovery],
  "@": zx.cms.content.anno.Feature.SIMPLE,

  construct() {
    super();
    window.REPORTWIDGET = this;
  },

  destruct() {
    this.__serverApiDiscovery.dispose();
    this.__serverApiDiscovery = null;
  },

  members: {
    /** @type{zx.reports.api.IReportDiscovery} */
    __serverApiDiscovery: null,

    /** @type{Object<String,zx.reports.api.IReportDescriptor>} available report descriptors, indexed by Id */
    __reportDescriptors: null,

    /** @type{zx.reports.api.IReportDescriptor} */
    __activeReportDescriptor: null,

    /** @type{*} parameters for the reports */
    __reportParams: null,

    /**
     * @Override
     */
    async getAvailableReports() {
      return Object.values(this.__reportDescriptors).map(descriptor => ({
        id: descriptor.getId(),
        name: descriptor.getName(),
        hidden: descriptor.isHidden()
      }));
    },

    /**
     * @Override
     */
    async setReportParams(params) {
      this.__reportParams = params;
    },

    /**
     * @Override
     */
    async setActiveReportId(reportId) {
      let reportDescriptor = null;
      if (reportId) {
        reportDescriptor = this.__reportDescriptors[reportId];
        if (!reportDescriptor) {
          throw new Error(`Report with ID ${reportId} not found`);
        }
      }
      if (this.__activeReportDescriptor) {
        this.__activeReportDescriptor.setRootElement(null);
      }

      this.removeAll();

      this.__activeReportDescriptor = reportDescriptor;
      if (reportDescriptor) {
        reportDescriptor.setRootElement(this);

        await reportDescriptor.setParamsAsync(this.__reportParams);
        await reportDescriptor.execute(reportDescriptor.getFormats()[0]);
      }
    },

    /**
     * @override
     */
    async onReady() {
      await qx.core.Init.getApplication().waitForReady();
      this.__serverApiDiscovery = zx.io.api.ApiUtils.createServerApi(zx.reports.api.IReportDiscovery, this);
      let iframeTransport = zx.io.api.transport.iframe.IframeServerTransport.getInstance();
      iframeTransport.sendReady();
      let pptrTransport = zx.thin.puppeteer.PuppeteerServerTransport.getInstance();
      pptrTransport.makeReady();

      let connectionManager = zx.io.api.server.ConnectionManager.getInstance();
      connectionManager.registerApi(this.__serverApiDiscovery, "/reports/discovery");

      this.setReportParams(this._getDefaultReportParams());

      let reportDescriptors = this._createReportDescriptors();
      this.__reportDescriptors = {};
      for (let reportDescriptor of reportDescriptors) {
        this.__reportDescriptors[reportDescriptor.getId()] = reportDescriptor;
        connectionManager.registerApi(reportDescriptor.getServerApi(), `/reports/executors/${reportDescriptor.getId()}`);
      }

      let searchParams = new URLSearchParams(window.location.search);
      let defaultReportId = searchParams.get("defaultReport");
      let reportDescriptor = defaultReportId ? this.__reportDescriptors[defaultReportId] : null;
      if (!reportDescriptor) {
        reportDescriptor = reportDescriptors[0];
      }

      let format = searchParams.get("format");
      if (format === "csv") {
        await reportDescriptor.setParamsAsync(this.__reportParams);
        await reportDescriptor.execute("csv");
      } else {
        await this.setActiveReportId(reportDescriptor.getId());
      }
    },

    /**
     * Provide a default set of report parameters to be used when the widget is first created;
     * to be optionally overridden by subclasses
     * By default, this will return the URL parameters of the current page
     *
     * @returns {Object} default report parameters
     */
    _getDefaultReportParams() {
      return Object.fromEntries(new URLSearchParams(window.location.search));
    },

    /**
     * Creates the report descriptors for the available reports.  Must be
     * overridden by subclasses
     *
     * @returns {zx.reports.api.IReportDescriptor[]} the report descriptors
     */
    _createReportDescriptors() {
      throw new Error(`Not implemented ${this.classname}._createReportDescriptors`);
    }
  }
});
