/**
 * A CollatingIterator iterates over a data source, and collates the data into the groups defined by a Report;
 * this assumes that it can read the entire data source in order to provide the necessary grouping, and therefore
 * can expose the grouped data in a way that user interface can navigate it (eg expanding a tree of data)
 */
qx.Class.define("zx.reports.CollatingIterator", {
  extend: qx.core.Object,

  /**
   * Constructor
   *
   * @param {zx.reports.datasource.IDataSource} datasource
   * @param {zx.reports.Report} report
   */
  construct(datasource, report) {
    super();
    this.__datasource = datasource;
    this.__report = report;
  },

  members: {
    /** @type{zx.reports.datasource.IDataSource} */
    __datasource: null,

    /** @type{zx.reports.Report} */
    __report: null,

    /**
     * Compiles a flat lookup of the groups, property accessors and sort method
     *
     * @typedef {Object} GroupInfo
     * @property {zx.reports.Group} group - the group
     * @property {Function} sortMethod - the sort method
     * @property {Function} getTitle - the title accessor
     * @property {Function} getValue - the value accessor
     * @property {Function} getValueUuid - the value uuid accessor
     * @property {Function} getExtraData - the extra data accessor
     *
     * @returns {GroupInfo[]}
     */
    _flattenGroups() {
      let groupInfos = [];
      let group = this.__report;
      while (group instanceof zx.reports.Group) {
        let sortMethod = group.getSortMethod();
        if (sortMethod == null) {
          sortMethod = function () {};
        } else if (sortMethod == "asc") {
          sortMethod = function (a, b) {
            return a.localeCompare(b);
          };
        } else if (sortMethod == "desc") {
          sortMethod = function (a, b) {
            return b.localeCompare(a);
          };
        } else if (typeof sortMethod != "function") {
          throw new Error(`Invalid sort method ${sortMethod}`);
        }

        let valueUuidAccessor = group.getValueUuidAccessor();
        if (valueUuidAccessor == null) {
          if (group.getValueAccessor() == null) {
            valueUuidAccessor = "_uuid";
          } else {
            valueUuidAccessor = group.getValueAccessor() + "._uuid";
          }
        }
        let titleAccessor = group.getTitleAccessor();
        if (titleAccessor == null) {
          if (group.getValueAccessor() !== null) {
            titleAccessor = group.getValueAccessor() + ".title";
          }
        }
        groupInfos.push({
          group,
          sortMethod,
          getTitle: zx.reports.Utils.compileGetter(titleAccessor),
          getValue: zx.reports.Utils.compileGetter(group.getValueAccessor() || titleAccessor),
          getValueUuid: zx.reports.Utils.compileGetter(valueUuidAccessor),
          getExtraData: zx.reports.Utils.compileGetter(group.getExtraDataAccessor())
        });
        group = group.getEach();
      }
      return groupInfos;
    },

    /**
     * Collects data for each level of a group; this is a heirarchial JSON representation of the data in
     * the datasource, which allows the group values (eg Customer Names, or Invoice Months) to be iterated
     * and sorted
     *
     * @typedef {Object} GroupData
     * @property {Object} row - the row that started this group
     * @property {String} title - the title of the group
     * @property {String} alias - the alias of the group
     * @property {String} valueUuid - the value's uuid
     * @property {GroupData[]} children - the child groups of this group
     * @property {Object[]?} rows - the rows in this group (only applicable for the bottom level)
     *
     * @param {GroupInfo[]} groupInfos - produced by `_flattenGroups`
     * @returns {GroupData} the root
     */
    async _collateGroupData(groupInfos) {
      let rootData = {
        row: null,
        title: null,
        alias: null,
        valueUuid: null,
        children: []
      };
      let currentDataFlat = [];

      // Collect and collate all rows
      await this.__datasource.open();
      while (await this.__datasource.next()) {
        let row = this.__datasource.current();
        let valueUuids = groupInfos.map(group => group.getValueUuid(row));
        while (currentDataFlat.length > 0) {
          let currentData = currentDataFlat[currentDataFlat.length - 1];
          if (currentData.valueUuid == valueUuids[currentDataFlat.length]) {
            break;
          }
          currentDataFlat.pop();
        }
        while (currentDataFlat.length < valueUuids.length) {
          let index = currentDataFlat.length;
          let parentData = index == 0 ? rootData : currentDataFlat[index - 1];
          let groupInfo = groupInfos[index];
          let childData = {
            row,
            groupInfo,
            title: groupInfo.getTitle(row),
            value: groupInfo.getValue(row),
            valueUuid: valueUuids[index]
          };
          if (parentData.children === undefined) {
            parentData.children = [];
          }
          parentData.children.push(childData);
          currentDataFlat.push(childData);
        }

        let parentData = currentDataFlat[currentDataFlat.length - 1];
        if (parentData.rows === undefined) {
          parentData.rows = [];
        }
        parentData.rows.push(row);
      }
      await this.__datasource.close();

      // Sort the data
      const sortGroupData = (groupData, groupIndex) => {
        if (groupData.children) {
          groupData.children.sort(groupInfos[groupIndex].sortMethod);
          groupData.children.forEach(childData => sortGroupData(childData, groupIndex + 1));
        }
        if (groupData.rows) {
          groupData.rows.sort(groupInfos[groupIndex - 1].sortMethod);
        }
      };
      sortGroupData(rootData, 0);
      return rootData;
    },

    /**
     * Executes the report
     *
     * @returns {Promise<qx.html.Element>}
     */
    async execute() {
      let groupInfos = this._flattenGroups();
      let rootData = await this._collateGroupData(groupInfos);

      const executeGroupData = async groupData => {
        let content = [];
        if (groupData.children) {
          for (let childData of groupData.children) {
            let group = childData.groupInfo.group;
            let groupContent = [];
            groupContent.push(await group.executeBefore(childData.row));
            groupContent.push(await executeGroupData(childData));
            groupContent.push(await group.executeAfter(childData.row));
            groupContent = groupContent.filter(html => !!html);
            groupContent = await group.executeWrap(childData.row, groupContent);
            for (let html of groupContent) {
              content.push(html);
            }
          }
        }
        if (groupData.rows) {
          for (let row of groupData.rows) {
            content.push(await groupData.groupInfo.group.executeRow(row));
          }
        }
        content = content.filter(html => !!html);
        if (content.length == 1) {
          return content[0];
        } else {
          return <div>{content}</div>;
        }
      };

      // Execute the report
      let content = await executeGroupData(rootData);
      return content;
    }
  }
});
