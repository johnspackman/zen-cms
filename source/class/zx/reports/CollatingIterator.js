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
 * A CollatingIterator iterates over a data source, and collates the data into the groups defined by a Report;
 * this assumes that it can read the entire data source in order to provide the necessary grouping, and therefore
 * can expose the grouped data in a way that user interface can navigate it (eg expanding a tree of data)
 *
 * @interface GroupData
 * @property {Object} row - the row that started this group
 * @property {String} title - the title of the group
 * @property {String} alias - the alias of the group
 * @property {String} valueUuid - the value's uuid
 * @property {GroupData[]} children - the child groups of this group
 * @property {Object[]?} rows - the rows in this group (only applicable for the bottom level)
 *
 * @interface GroupInfo
 * @property {zx.reports.Group} group - the group
 * @property {Function} sortMethod - the sort method
 * @property {Function} getTitle - the title accessor
 * @property {Function} getValue - the value accessor
 * @property {Function} getValueUuid - the value uuid accessor
 * @property {Function} getExtraData - the extra data accessor
 *
 * @interface GroupExecutionState
 * @property {Number} childIndex - the index of the current child in `groupData.children`
 * @property {GroupData} childData - the current child data. Same as `groupData.children[childIndex]`
 * @property {GroupData} groupData - the current group data
 *
 * @typedef {(GroupFilterFunc | string | null)} GroupFilter
 */
qx.Class.define("zx.reports.CollatingIterator", {
  extend: qx.core.Object,
  implement: [zx.reports.IReportIterator],

  /**
   * Constructor
   *
   * @param {zx.reports.Report} report
   * @param {zx.reports.datasource.IDataSource?} ds the data source to use
   */
  construct(report, ds) {
    super();
    this.__report = report;
    if (ds) {
      this.setDatasource(ds);
    }
  },

  members: {
    /**
     * @type {GroupExecutionState[]}
     */
    __executionContext: null,

    /** @type {zx.reports.datasource.IDataSource} */
    __datasource: null,

    /** @type {zx.reports.Report} */
    __report: null,

    /**
     * @type {GroupInfo[]}
     */
    __groupInfos: null,

    /** @type {GroupData} */
    __rootData: null,

    /**
     * @type {GroupFilter[]}
     */
    __groupFilters: null,

    /**
     * The data source to use
     *
     * @param {zx.reports.datasource.IDataSource} datasource
     */
    setDatasource(datasource) {
      if (this.__datasource != datasource) {
        this.__datasource = datasource;
        this.__rootData = null;
        this.__groupInfos = null;
        this.__groupFilters = null;
      }
    },

    /**
     * Compiles a flat lookup of the groups, property accessors and sort method
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
        if (typeof a === "string" || typeof b === "string") {
          a = String(a);
          b = String(b);
        } else if (typeof a === "number" && typeof b === "number") {
          if (isNaN(a)) {
            a = 0;
          }
          if (isNaN(b)) {
            b = 0;
          }
          return a - b;
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
              if (value) {
                title = value.title || (value.getTitle ? value.getTitle() : null);
                if (title) {
                  return title;
                }
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
            return true;
          };
        }
        if (getValue && !getValueUuid) {
          getValueUuid = row => {
            let value = getValue(row);
            if (value) {
              let uuid = value._uuid || value.uuid || (value.toUuid ? value.toUuid() : null);
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
            if (groupIndex > 0) {
              let parentGroupData = groupDataStack[groupIndex - 1];
              groupDataStack[groupIndex] = (parentGroupData.children && parentGroupData.children[valueUuid]) || null;
            } else {
              groupDataStack[groupIndex] = rootData.children[valueUuid];
            }
            if (!groupDataStack[groupIndex]) {
              groupDataStack[groupIndex] = {
                _classname: groupInfo.group.classname,
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

    /**
     * Initialises the iterator; this is called when the report is executed, and is safe to call multiple times
     */
    async _initialise() {
      if (!this.__datasource) {
        return false;
      }
      if (!this.__groupInfos) {
        this.__groupInfos = this._flattenGroups();
        this.__updateGroupFilters();
      }
      if (!this.__rootData) {
        this.__rootData = await this._collateGroupData(this.__groupInfos);
      }
      return true;
    },

    /**
     * @Override
     */
    async getDrilldown() {
      if (!(await this._initialise())) {
        return null;
      }
      let rootData = this.__rootData;

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

      // Compile the drill down data
      let meta = executeGroupData(rootData);
      return meta?.children || null;
    },

    /**
     * @typedef {(groupValue: any, groupValueUuid: string, row: Object) => boolean} GroupFilterFunc
     * @param {GroupFilter[]}
     */
    setGroupFilters(groupFilters) {
      if (qx.core.Environment.get("qx.debug")) {
        this.assertTrue(groupFilters == null || qx.lang.Type.isArray(groupFilters), "groupFilters must be an array");
      }
      if (groupFilters) {
        groupFilters = groupFilters.map(groupFilter => {
          if (groupFilter == null) {
            return () => true;
          }
          if (qx.lang.Type.isString(groupFilter)) {
            return (groupValue, groupValueUuid, row) => groupFilter === groupValueUuid;
          }
          if (qx.lang.Type.isArray(groupFilter)) {
            return (groupValue, groupValueUuid, row) => groupFilter.find(groupFilter => groupFilter === groupValueUuid);
          }
          if (qx.lang.Type.isFunction(groupFilter)) {
            return groupFilter;
          }
          throw new Error(`Invalid group filter ${groupFilter}`);
        });
      }
      this.__groupFilters = groupFilters;
      if (this.__groupInfos) {
        this.__updateGroupFilters();
      }
    },

    __updateGroupFilters() {
      if (this.__groupInfos) {
        for (let groupIndex = 0; groupIndex < this.__groupInfos.length; groupIndex++) {
          let groupInfo = this.__groupInfos[groupIndex];
          let groupFilter = (this.__groupFilters && this.__groupFilters[groupIndex]) || null;
          groupInfo.groupFilter = groupFilter;
        }
      }
    },

    /**
     * @Override
     */
    async execute() {
      if (!(await this._initialise())) {
        return <div></div>;
      }
      let rootData = this.__rootData;
      this.__executionContext = [];

      const executeGroupData = async groupData => {
        let groupFilter = groupData.groupInfo?.groupFilter;
        if (groupFilter && groupData.value) {
          let filterResult = groupFilter(groupData.value, groupData.valueUuid, groupData.row);
          if (!filterResult) {
            return [];
          }
        }

        let content = [];
        let group = groupData.groupInfo.group;
        let groupContent = [];

        let context = { childIndex: -1, childData: null, groupData };
        this.__executionContext.push(context);

        group.resetAccumulators();
        groupContent.push(await group.executeBefore(groupData.row));

        if (qx.core.Environment.get("qx.debug")) {
          this.assertTrue(!groupData.children || !groupData.rows, "GroupData cannot have both children and rows");
        }

        let allChildContent = [];
        if (groupData.children) {
          for (let childData of groupData.children) {
            context.childIndex++;
            context.childData = childData;
            let childContent = await executeGroupData(childData);
            if (childContent) {
              for (let html of childContent) {
                allChildContent.push(html);
              }
            }
          }
        }
        if (groupData.rows) {
          for (let row of groupData.rows) {
            context.childIndex++;
            context.row = row;
            allChildContent.push(await groupData.groupInfo.group.executeRow(row));
          }
        }

        if (groupData.groupInfo) {
          allChildContent = await group.executeWrapBody(groupData.row, allChildContent);
        }
        for (let html of allChildContent) {
          groupContent.push(html);
        }

        groupContent.push(await group.executeAfter(groupData.row));
        groupContent = groupContent.filter(html => !!html);
        for (let html of groupContent) {
          content.push(html);
        }
        if (groupData.groupInfo) {
          content = await group.executeWrap(groupData.row, content);
        }

        this.__executionContext.pop();
        content = content.filter(html => !!html);

        return content;
      };
      // Execute the report
      let content = [];
      for (let childData of rootData.children) {
        let tmp = await executeGroupData(childData);
        if (tmp) {
          for (let html of tmp) {
            content.push(html);
          }
        }
      }
      this.__executionContext = null;
      return <div>{content}</div>;
    },

    /**
     * An array (zipper) containing information about the current groups that we are in and
     * the current children that we are executing.
     *
     * NOTE: currently doesn't work when we are executing CSV (returns null).
     * @returns {GroupExecutionState[]}
     */
    getExecutionContext() {
      return this.__executionContext;
    },

    /**
     * @Override
     */
    async executeAsCsv() {
      if (!(await this._initialise())) {
        return [];
      }
      let rootData = this.__rootData;

      const executeGroupData = async groupData => {
        let groupFilter = groupData.groupInfo?.groupFilter;
        if (groupFilter && groupData.value) {
          let filterResult = groupFilter(groupData.value, groupData.valueUuid, groupData.row);
          if (!filterResult) {
            return [];
          }
        }

        let content = [];
        if (groupData.children) {
          for (let childData of groupData.children) {
            let childGroup = childData.groupInfo.group;
            childGroup.resetAccumulators();
            let childRows = [];

            if (!this.__report.getCsvHeaders()) {
              childRows.push(await childGroup.executeAsCsvBefore(childData.row));
            }
            let childContent = await executeGroupData(childData);
            if (childContent) {
              for (let csvRow of childContent) {
                childRows.push(csvRow);
              }
            }
            childRows.push(await childGroup.executeAsCsvAfter(childData.row));
            childRows = childRows.filter(csvRow => !!csvRow);
            for (let csvRow of childRows) {
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

      if (this.__report.getCsvHeaders()) {
        content.unshift(this.__report.getCsvHeaders());
      }
      return content;
    }
  }
});
