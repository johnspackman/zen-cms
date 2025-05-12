/**
 * CSV Parser
 *
 * Implementation from http://stackoverflow.com/a/12785546/2979698
 *
 */
qx.Class.define("zx.utils.Csv", {
  extend: qx.core.Object,

  statics: {
    parse(csv, reviver) {
      reviver =
        reviver ||
        function (r, c, v) {
          return v;
        };
      var chars = csv.split("");
      var c = 0;
      var cc = chars.length;
      var start;
      var end;
      var table = [];
      var row;
      while (c < cc) {
        table.push((row = []));
        while (c < cc && "\r" !== chars[c] && "\n" !== chars[c]) {
          start = end = c;
          if ('"' === chars[c]) {
            start = end = ++c;
            while (c < cc) {
              if ('"' === chars[c]) {
                if ('"' !== chars[c + 1]) {
                  break;
                } else chars[++c] = ""; // unescape ""
              }
              end = ++c;
            }
            if ('"' === chars[c]) {
              ++c;
            }
            while (c < cc && "\r" !== chars[c] && "\n" !== chars[c] && "," !== chars[c]) {
              ++c;
            }
          } else {
            while (c < cc && "\r" !== chars[c] && "\n" !== chars[c] && "," !== chars[c]) {
              end = ++c;
            }
          }
          row.push(reviver(table.length - 1, row.length, chars.slice(start, end).join("")));

          if ("," === chars[c]) {
            ++c;
            if (c == cc) {
              row.push(reviver(table.length - 1, row.length, ""));
            }
          }
        }
        if ("\r" === chars[c]) {
          ++c;
        }
        if ("\n" === chars[c]) {
          ++c;
        }
      }
      return table;
    },

    /**
     * Transforms a 2D array of values into a CSV string
     * @template ValueType
     * @param {ValueType[][]} table A 2D array of values
     * @param {(row: number, col: number, value: ValueType) => ValueType} replacer A function that can be used to replace values
     * @returns {string} The ouput CSV data
     */
    stringify(table, replacer) {
      replacer =
        replacer ||
        function (r, c, v) {
          return v;
        };
      var csv = "";
      var c;
      var cc;
      var r;
      var rr = table.length;
      var cell;
      for (r = 0; r < rr; ++r) {
        for (c = 0, cc = table[r].length; c < cc; ++c) {
          if (c) {
            csv += ",";
          }
          cell = replacer(r, c, table[r][c]);
          if (/[,\r\n"]/.test(cell)) {
            cell = '"' + cell.replace(/"/g, '""') + '"';
          }
          csv += cell || 0 === cell ? cell : "";
        }
        csv += "\n";
      }
      return csv;
    },

    stringifyRow(row, replacer) {
      replacer =
        replacer ||
        function (r, c, v) {
          return v;
        };
      var csv = "";
      var c;
      var cc;
      var cell;
      for (c = 0, cc = row.length; c < cc; ++c) {
        if (c) {
          csv += ",";
        }

        cell = replacer(0, c, row[c]);
        if (/[,\r\n"]/.test(cell)) {
          cell = '"' + cell.replace(/"/g, '""') + '"';
        }

        csv += cell || 0 === cell ? cell : "";
      }
      return csv;
    }
  }
});
