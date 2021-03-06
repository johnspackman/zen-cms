/* ************************************************************************
*
*  Zen [and the art of] CMS
*
*  https://zenesis.com
*
*  Copyright:
*    2019-2022 Zenesis Ltd, https://www.zenesis.com
*
*  License:
*    MIT (see LICENSE in project root)
*
*  Authors:
*    John Spackman (john.spackman@zenesis.com, @johnspackman)
*
* ************************************************************************ */


qx.Class.define("zx.cli.Argument", {
  extend: zx.cli.AbstractValue,

  properties: {
    type: {
      init: "string",
      refine: true
    }
  },

  members: {
    /**
     * Returns a string that can be used to in the usage output of the command
     *
     * @return {String}
     */
    usage() {
      let str = "";
      if (this.getName()) {
        str += this.getName();
        if (this.isArray()) str += "...";
      }

      const TYPES = {
        string: "String",
        boolean: "Boolean",
        integer: "Integer",
        float: "Float"
      };
      let type = this.getType();
      if (type && type != "string") {
        if (this.isArray()) str += " (" + TYPES[type] + "s)";
        else str += " (" + TYPES[type] + ")";
      }

      if (this.getDescription()) str += "  ::  " + this.getDescription();

      return str;
    },

    /**
     * Parses the argument
     *
     * @param {String} initialValue
     * @param {Function} fnGetMore
     */
    parse(initialValue, fnGetMore) {
      let type = this.getType();

      function parseNext(arg, index) {
        function noMatch(msg) {
          if (index == 0) throw new Error(msg);
          return null;
        }
        switch (type) {
          case "string":
          case null:
            return arg;

          case "boolean":
            if (arg == "true" || arg == "yes" || arg == "1") return true;
            if (arg == "false" || arg == "no" || arg == "0") return false;
            return noMatch(
              "Invalid value for " + this.toString() + ", expected nothing (true) or the words true or false"
            );

          case "integer":
            var value = parseInt(arg, 10);
            if (isNaN(arg)) return noMatch(`Invalid value for ${this.toString()}, expected an integer`);
            return value;

          case "float":
            var value = parseFloat(arg);
            if (isNaN(arg)) return noMatch(`Invalid value for ${this.toString()}, expected a number`);
            return value;
        }
        if (arg === null) return noMatch(`Invalid value for ${this.toString()}, expected a string`);
        return arg;
      }

      let argvIndex = 0;
      function next() {
        let value = fnGetMore(argvIndex++);
        if (value === null) argvIndex--;
        return value;
      }

      let arg = initialValue;
      let result = null;
      if (this.isArray()) {
        if (arg === null) throw new Error(`Invalid value for ${this.toString()}, expected at least one value`);
        result = [];
        let index = 0;
        do {
          let value = parseNext(arg, index++);
          if (value === null) {
            argvIndex--;
            break;
          }
          result.push(value);
          arg = next();
        } while (arg);
      } else {
        result = parseNext(arg);
      }

      fnGetMore(argvIndex, true);
      this.setValue(result);
    }
  }
});
