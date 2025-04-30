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
        if (getValue && !getValueUuid) {
          getValueUuid = row => {
            let value = getValue(row);
            let uuid = value._uuid || value.uuid || (value.toUuid ? value.toUuid() : null);
            if (uuid) {
              return uuid;
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
          getMeta: zx.reports.Utils.compileGetter(group.getMeta()),
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

      let group = this.__report.getEach();
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
      const removeAllStartingAt = (array, index) => {
        if (array.length > index) {
          array.splice(index, array.length - index);
        }
        return array;
      };
      let rootData = {
        children: {}
      };

      let groupDataStack = [];

      // Collect and collate all rows
      await this.__datasource.open();
      while (await this.__datasource.next()) {
        let row = this.__datasource.current();
        let currentData = rootData;
        for (let groupIndex = 0; groupIndex < groupInfos.length; groupIndex++) {
          let groupInfo = groupInfos[groupIndex];
          let valueUuid = groupInfo.getValueUuid ? groupInfo.getValueUuid(row) : null;
          if (groupDataStack[groupIndex] === undefined || groupDataStack[groupIndex].valueUuid !== valueUuid) {
            removeAllStartingAt(groupDataStack, groupIndex);
            groupDataStack[groupIndex] = {
              row,
              groupInfo,
              title: groupInfo.getTitle(row),
              value: groupInfo.getValue(row),
              valueUuid
            };
            if (groupIndex > 0) {
              let parentGroupData = groupDataStack[groupIndex - 1];
              if (!parentGroupData.children) {
                parentGroupData.children = {};
              }
              parentGroupData.children[valueUuid] = groupDataStack[groupIndex];
            } else {
              rootData.children[valueUuid] = groupDataStack[groupIndex];
            }
          }
        }
        if (!groupDataStack[groupInfos.length - 1].rows) {
          groupDataStack[groupInfos.length - 1].rows = [];
        }
        groupDataStack[groupInfos.length - 1].rows.push(row);
      }
      await this.__datasource.close();

      // Sort the data
      const sortGroupData = (groupData, groupIndex) => {
        if (groupData.children) {
          groupData.children = Object.values(groupData.children);
          groupData.children.sort(groupInfos[groupIndex].sortMethod);
          groupData.children.forEach(childData => sortGroupData(childData, groupIndex + 1));
        }
      };
      sortGroupData(rootData, 0);
      return rootData;
    },

    async _initialise() {
      if (!this._groupInfos) {
        this._groupInfos = this._flattenGroups();
      }
      if (!this._rootData) {
        this._rootData = await this._collateGroupData(this._groupInfos);
      }
    },

    async getDrilldown() {
      await this._initialise();
      let rootData = this._rootData;

      const executeGroupData = groupData => {
        let meta = {
          title: groupData.title ?? null,
          uuid: groupData.valueUuid ?? null,
          meta: groupData.groupInfo?.getMeta(groupData.value, groupData.row) ?? null
        };
        if (groupData.children) {
          meta.children = [];
          for (let childGroupData of groupData.children) {
            let childMeta = executeGroupData(childGroupData);
            meta.children.push(childMeta);
          }
        }
        return meta;
      };

      // Execute the report
      let meta = executeGroupData(rootData);
      return meta;
    },

    /**
     * Executes the report
     *
     * @returns {Promise<qx.html.Element>}
     */
    async execute() {
      await this._initialise();
      let rootData = this._rootData;

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
      await this._initialise();
      let rootData = this._rootData;

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
