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


qx.Class.define("zx.cli.Flag", {
  extend: zx.cli.AbstractValue,

  properties: {
    /** Short alternative */
    shortCode: {
      init: null,
      nullable: true,
      check: "String"
    }
  },

  members: {
    /**
     * Tests whether this matches the string (name or short code)
     *
     * @param {String} arg
     * @returns {Boolean}
     */
    is(arg) {
      let pos = arg.indexOf("=");
      if (pos > -1) arg = arg.substring(0, pos);
      if (arg.startsWith("--")) {
        let tmp = qx.lang.String.camelCase(arg.substring(2));
        return tmp == this.getName();
      } else if (arg.startsWith("-")) {
        return arg.substring(1) == this.getShortCode();
      }

      return false;
    },

    /**
     * Returns a string that can be used to in the usage output of the command
     *
     * @return {String}
     */
    usage() {
      let str = "--" + qx.lang.String.hyphenate(this.getName());
      if (this.getShortCode()) str += "|-" + this.getShortCode();

      const TYPES = {
        string: "String",
        boolean: "Boolean",
        integer: "Integer",
        float: "Float"
      };
      let type = this.getType();
      if (type && type != "string") str += " (" + TYPES[type] + ")";

      if (this.getDescription()) str += "  ::  " + this.getDescription();

      return str;
    },

    /**
     * Parses the flag
     *
     * @param {*} cmdName
     * @param {*} fnGetMore
     */
    parse(cmdName, fnGetMore) {
      let pos = cmdName.indexOf("=");
      let initialValue = null;
      if (pos > -1) {
        initialValue = cmdName.substring(pos + 1);
        cmdName = cmdName.substring(0, pos);
      }

      let eatAll = false;
      let argIndex = 0;

      function getArg(index) {
        if (initialValue !== null) return index == 0 ? initialValue : fnGetMore(index - 1);
        return fnGetMore(index);
      }

      function next() {
        let value = getArg(argIndex++);
        if (value == "--") {
          eatAll = true;
          value = getArg(argIndex++);
        }
        if (!eatAll && value) {
          if (value[0] == "-") value = null;
        }
        if (value === null) argIndex--;
        return value;
      }

      let type = this.getType();

      const parseNext = (arg, pass) => {
        switch (type) {
          case "string":
          case null:
            if (arg === null) return null;
            if (initialValue === null && pass == 0) {
              argIndex--;
            }
            return arg;

          case "boolean":
            if (arg === null) return true;
            if (arg == "true" || arg == "yes" || arg == "1") return true;
            if (arg == "false" || arg == "no" || arg == "0") return false;
            if (initialValue === null && pass == 0) {
              argIndex--;
              return true;
            }
            throw new Error(
              "Invalid value for " + this.toString() + ", expected nothing (true) or the words true or false"
            );

          case "integer":
            if (arg === null) throw new Error(`Invalid value for ${this.toString()}, expected an integer`);
            var value = parseInt(arg, 10);
            if (isNaN(arg)) throw new Error(`Invalid value for ${this.toString()}, expected an integer`);
            return value;

          case "float":
            if (arg === null) throw new Error(`Invalid value for ${this.toString()}, expected a number`);
            var value = parseFloat(arg);
            if (isNaN(arg)) throw new Error(`Invalid value for ${this.toString()}, expected a number`);
            return value;
        }
        if (arg === null) throw new Error(`Invalid value for ${this.toString()}, expected a string`);
        return arg;
      };

      let arg = next();
      let result = null;
      if (this.isArray()) {
        if (arg === null) throw new Error(`Invalid value for ${this.toString()}, expected at least one value`);
        result = [];
        do {
          let value = parseNext(arg, result.length);
          result.push(value);
          arg = next();
        } while (arg);
      } else {
        result = parseNext(arg, 0);
      }

      if (initialValue) fnGetMore(argIndex - 1, true);
      else fnGetMore(argIndex, true);
      this.setValue(result);
    }
  }
});
