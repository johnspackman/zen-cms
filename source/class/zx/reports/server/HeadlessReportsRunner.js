qx.Class.define("zx.reports.server.HeadlessReportsRunner", {
  type: "static",
  statics: {
    /**
     * Iterates through reports provided by a page that uses zx.reports.thin.AbstractReportRunnerFeature.
     * This is useful for rendering reports to PDFs or CSVs and saving them to disk.
     * @param {zx.server.work.Worker} worker
     * @param {string} url Url of the page that provides the report runner feature
     * @param {Options} options
     *
     * @interface Options
     * @property {Object} clientProperties Properties which will be set on the instance of zx.server.puppeteer.PuppeteerClient
     * @property {string?} reportId If specified, only the report with this ID will be generated.
     * @property {(data: OnReportData) => Promise<void>} onReport Callback to be called for each report. This should do things like write capture the report PDFs and save them to disk.
     * It receives the controller, report info, client API executor and section meta.
     *
     * @interface OnReportData
     * @property {zx.server.puppeteer.PuppeteerWorkController} ctlr The puppeteer controller
     * @property {Object} reportInfo Object containing report information, such as id and name
     * @property {zx.reports.api.IReportExecutor} clientApiExecutor Objected used to interact with the report
     * @property {Object} sectionMeta Meta data returned for the drilldown section of the report
     *
     */
    async execute(worker, url, options) {
      let onReport = options.onReport;
      worker.appendWorkLog("Opening page at " + url);
      let ctlr = new zx.server.puppeteer.PuppeteerWorkController(worker, url, [], options.clientProperties);
      worker.appendWorkLog("Created PuppeteerWorkController");
      await ctlr.open();
      worker.appendWorkLog("Controller opened");

      let clientTransport = ctlr.getTransport();
      let reportDiscoveryApi = zx.io.api.ApiUtils.createClientApi(zx.reports.api.IReportDiscovery, clientTransport, "/reports/discovery");
      let reportInfos = await reportDiscoveryApi.getAvailableReports();

      worker.appendWorkLog(`Found ${reportInfos.length} reports available`);

      if (options.reportId) {
        reportInfos = reportInfos.filter(rd => rd.id === options.reportId);
      }

      for (let reportInfo of reportInfos) {
        worker.appendWorkLog(`Generating report ${reportInfo.name} (${reportInfo.id})`);
        let clientApiExecutor = zx.io.api.ApiUtils.createClientApi(
          zx.reports.api.IReportExecutor, //br
          clientTransport,
          "/reports/executors/" + reportInfo.id
        );

        await reportDiscoveryApi.setActiveReportId(reportInfo.id);

        let drilldown = await clientApiExecutor.getDrilldown();
        if (drilldown) {
          let baseGroupFilters = [];
          let outerMeta = null;
          if (drilldown.length === 1 && !drilldown[0].title) {
            outerMeta = drilldown[0].meta;
            drilldown = drilldown[0].children || [];
            baseGroupFilters = [null];
          }
          worker.appendWorkLog(`Drilldown found for report ${reportInfo.name} (${reportInfo.id}) with ${drilldown.length} items`);
          if (outerMeta) {
            await onReport({ ctlr, reportInfo, clientApiExecutor, sectionMeta: outerMeta });
          } else {
            for (let json of drilldown) {
              if (!(json.title && json.uuid)) {
                continue;
              }
              await clientApiExecutor.setGroupFilters([...baseGroupFilters, json.uuid]);
              await onReport({ ctlr, reportInfo, clientApiExecutor, sectionMeta: json.meta });
            }
          }
        }
      }

      await ctlr.close();
      await ctlr.dispose();
    }
  }
});
