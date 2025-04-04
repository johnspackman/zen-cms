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

      const compare = (a, b) => {
        if (a === undefined) {
          a = null;
        }
        if (b === undefined) {
          b = null;
        }
        if (a === null && b === null) {
          return 0;
        }
        if (a === null) {
          return -1;
        }
        if (b === null) {
          return 1;
        }
        return a.localeCompare(b);
      };

      const createGroupInfo = (group, isLast) => {
        let getValue = null;
        if (group.getValueAccessor()) {
          getValue = zx.reports.Utils.compileGetter(group.getValueAccessor());
        } else {
          getValue = row => row;
        }

        let getTitle = null;
        if (group.getTitleAccessor()) {
          getTitle = zx.reports.Utils.compileGetter(group.getTitleAccessor());
        } else {
          getTitle = row => {
            let title = row.title || (row.getTitle ? row.getTitle() : null);
            if (title) {
              return title;
            }
            if (getValue) {
              let value = getValue(row);
              title = value.title || (value.getTitle ? value.getTitle() : null);
              if (title) {
                return title;
              }
            }
            return null;
          };
        }

        let getValueUuid = null;
        if (group.getValueUuidAccessor()) {
          getValueUuid = zx.reports.Utils.compileGetter(group.getValueUuidAccessor());
        } else if (isLast) {
          getValueUuid = row => {
            let uuid = row._uuid || row.uuid || (row.toUuid ? row.toUuid() : null);
            if (uuid) {
              return uuid;
            }
            if (getValue) {
              let value = getValue(row);
              uuid = value._uuid || value.uuid || (value.toUuid ? value.toUuid() : null);
              if (uuid) {
                return uuid;
              }
            }
            if (getTitle) {
              let title = getTitle(row);
              if (title) {
                return title;
              }
            }
            return null;
          };
        }

        let groupInfo = {
          group,
          getTitle,
          getValue,
          getValueUuid,
          getExtraData: zx.reports.Utils.compileGetter(group.getExtraDataAccessor())
        };

        const defaultSortMethod = function (a, b) {
          a = groupInfo.getTitle(a.row);
          b = groupInfo.getTitle(b.row);
          return compare(a, b);
        };

        let sortMethod = group.getSortMethod();
        if (sortMethod == null) {
          groupInfo.sortMethod = function () {};
        } else if (sortMethod == "asc") {
          groupInfo.sortMethod = defaultSortMethod;
        } else if (sortMethod == "desc") {
          groupInfo.sortMethod = (a, b) => -defaultSortMethod(a, b);
        } else if (typeof sortMethod != "function") {
          throw new Error(`Invalid sort method ${sortMethod}`);
        } else {
          groupInfo.sortMethod = (a, b) => group.getSortMethod()(a, b);
        }

        return groupInfo;
      };

      while (group instanceof zx.reports.Group) {
        group.toHashCode();
        let isLast = !(group.getEach() instanceof zx.reports.Group);
        let groupInfo = createGroupInfo(group, isLast);
        groupInfos.push(groupInfo);
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
        children: {}
      };

      // Collect and collate all rows
      await this.__datasource.open();
      while (await this.__datasource.next()) {
        let row = this.__datasource.current();
        let currentData = rootData;
        for (let groupIndex = 0; groupIndex < groupInfos.length; groupIndex++) {
          let groupInfo = groupInfos[groupIndex];
          let valueUuid = groupInfo.getValueUuid ? groupInfo.getValueUuid(row) : null;
          if (currentData.children === undefined) {
            currentData.children = {};
          }
          let groupData = currentData.children[valueUuid];
          if (groupData === undefined) {
            groupData = {
              row,
              groupInfo,
              title: groupInfo.getTitle(row),
              value: groupInfo.getValue(row),
              valueUuid
            };
            currentData.children[valueUuid] = groupData;
          }
          currentData = groupData;
        }
        if (currentData.rows === undefined) {
          currentData.rows = [];
        }
        currentData.rows.push(row);
      }
      await this.__datasource.close();

      // Sort the data
      const sortGroupData = (groupData, groupIndex) => {
        if (groupData.rows) {
          groupData.rows.sort(groupInfos[groupIndex - 1].sortMethod);
        }
        if (groupData.children) {
          groupData.children = Object.values(groupData.children);
          groupData.children.sort(groupInfos[groupIndex].sortMethod);
          groupData.children.forEach(childData => sortGroupData(childData, groupIndex + 1));
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
            let childContent = await executeGroupData(childData);
            if (childContent) {
              for (let html of childContent) {
                groupContent.push(html);
              }
            }
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
        return content;
      };

      // Execute the report
      let content = await executeGroupData(rootData);
      return <div>{content}</div>;
    },

    /**
     * Executes the report
     *
     * @returns {Promise<qx.html.Element>}
     */
    async executeAsCsv() {
      let groupInfos = this._flattenGroups();
      let rootData = await this._collateGroupData(groupInfos);

      const executeGroupData = async groupData => {
        let content = [];
        if (groupData.children) {
          for (let childData of groupData.children) {
            let group = childData.groupInfo.group;
            let groupContent = [];
            groupContent.push(await group.executeAsCsvBefore(childData.row));
            let childContent = await executeGroupData(childData);
            if (childContent) {
              for (let csvRow of childContent) {
                groupContent.push(csvRow);
              }
            }
            groupContent.push(await group.executeAsCsvAfter(childData.row));
            groupContent = groupContent.filter(csvRow => !!csvRow);
            for (let csvRow of groupContent) {
              content.push(csvRow);
            }
          }
        }
        if (groupData.rows) {
          for (let row of groupData.rows) {
            content.push(await groupData.groupInfo.group.executeAsCsvRow(row));
          }
        }
        content = content.filter(csvRow => !!csvRow);
        return content;
      };

      // Execute the report
      let content = await executeGroupData(rootData);
      return content;
    }
  }
});
