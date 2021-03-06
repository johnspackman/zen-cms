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


qx.Class.define("zx.cli.Command", {
  extend: qx.core.Object,

  construct(name) {
    this.base(arguments);
    this.setName(name);
    this.__subcommands = [];
    this.__flags = [];
    this.__arguments = [];
    this.addFlag(
      new zx.cli.Flag("help").set({
        description: "Outputs usage summary",
        type: "boolean"
      })
    );
  },

  properties: {
    /** The name that is this part of the command */
    name: {
      check: "String",
      transform: "__transformName"
    },

    /** Short equivalent of the name */
    shortCode: {
      init: null,
      nullable: true,
      check: "String"
    },

    /** Optional description */
    description: {
      init: null,
      nullable: true,
      check: "String"
    },

    /** Function to run this command */
    run: {
      init: null,
      nullable: true,
      check: "Function"
    }
  },

  members: {
    /** @type{zx.cli.Command[]} subcommands */
    __subcommands: null,

    /** @type{zx.cli.Command} parent comamnd */
    __parent: null,

    /** @type{zx.cli.Flag[]} list of flag definitions */
    __flags: null,

    /** @type{zx.cli.Argument} list of positional arguments */
    __arguments: null,

    /** @type{String[]?} list of error messages */
    __errors: null,

    /**
     * Adds a sub command
     *
     * @param {zx.cli.Command} cmd
     */
    addSubcommand(cmd) {
      this.__subcommands.push(cmd);
      cmd.__parent = this;
    },

    /**
     * Returns the parent command if this is a sub command
     *
     * @returns {zx.cli.Command?}
     */
    getParent() {
      return this.__parent;
    },

    /**
     * Adds a flag
     *
     * @param {zx.cli.Flag} flag
     */
    addFlag(flag) {
      this.__flags.push(flag);
    },

    /**
     * Locates a flag by name
     *
     * @param {String} name
     * @return {zx.cli.Flag}
     */
    getFlag(name) {
      name = qx.lang.String.camelCase(name);
      for (let i = 0; i < this.__flags.length; i++) if (this.__flags[i].getName() == name) return this.__flags[i];
      return null;
    },

    /**
     * Adds a positional argument
     *
     * @param {zx.cli.Argument} argument
     */
    addArgument(argument) {
      this.__arguments.push(argument);
    },

    /**
     * Locates an argument by name or index
     *
     * @param {String|Integer} name
     * @return {zx.cli.Argument}
     */
    getArgument(name) {
      if (typeof name == "string") {
        name = qx.lang.String.camelCase(name);
        for (let i = 0; i < this.__arguments.length; i++)
          if (this.__arguments[i].getName() == name) return this.__arguments[i];
        return null;
      }
      return this.__arguments[name] || null;
    },

    /**
     * Transform for `name`
     */
    __transformName(value) {
      return qx.lang.String.camelCase(value);
    },

    /**
     * Parses the command, where this is the root of the command structure
     *
     * @param {String[]?} argv arguments, where argv[0] is the command name (typically the filename, what would be `$0` in bash)
     */
    parseRoot(argv) {
      if (!argv) {
        argv = qx.lang.Array.clone(process.argv);
        qx.lang.Array.removeAt(argv, 0);
      }

      let exe = argv[0];
      let pos = exe.lastIndexOf("/");
      if (pos > -1) exe = exe.substring(pos + 1);
      this.setName(exe);

      let argvIndex = 1;
      function fnGetMore(index, rebase) {
        let value = null;
        if (argv.length > index + argvIndex) value = argv[index + argvIndex];
        if (rebase) argvIndex += index;
        return value;
      }

      return this.parse(argv[0], fnGetMore);
    },

    /**
     * Prints usage information
     */
    usage() {
      let out = [""];
      function print(...args) {
        out[out.length - 1] += args.join(" ");
      }
      function println(...args) {
        print(...args);
        out.push("");
      }
      let columnify = require("columnify");
      function table(data) {
        let str = columnify(data, { showHeaders: false });
        str = str
          .split("\n")
          .map(row => "   " + row)
          .join("\n");
        println(str);
      }

      let verbs = [];
      for (let tmp = this; tmp; tmp = tmp.getParent()) verbs.unshift(qx.lang.String.hyphenate(tmp.getName()));

      println("USAGE:");
      print(`   ${verbs.join(" ")}`);
      if (this.__flags.length > 0) print(` [FLAGS]`);
      if (this.__subcommands.length > 0) print(` [COMMAND]`);
      if (this.__arguments.length > 0) print(` [ARGUMENTS]`);
      println();
      if (this.__flags.length > 0) {
        println();
        println("FLAGS:");
        let data = [];
        this.__flags.forEach(flag => data.push(flag.usage().split(/\s+::\s+/)));
        table(data);
      }
      if (this.__subcommands.length > 0) {
        println();
        println("COMMANDS:");
        let data = [];
        this.__subcommands.forEach(cmd => data.push(cmd._quickUsage().split(/\s+::\s+/)));
        table(data);
      }
      if (this.__arguments.length > 0) {
        println();
        println("ARGUMENTS:");
        let data = [];
        this.__arguments.forEach(argument => data.push(argument.usage().split(/\s+::\s+/)));
        table(data);
      }
      return out.join("\n");
    },

    /**
     * Quick one line usage description
     *
     * @returns {String}
     */
    _quickUsage() {
      let str = this.getName();
      str = qx.lang.String.hyphenate(str);
      if (this.__subcommands.length) str += " (...)";
      if (this.getDescription()) str += "  ::  " + this.getDescription();
      return str;
    },

    /**
     * Returns the values parsed for flags and arguments as a handy POJO; the
     *
     * @typedef ValuesDef
     * @property {Map<String,Object>} flags
     * @property {Map<String,Object>} arguments
     *
     * @return {ValuesDef}
     */
    getValues() {
      let result = {
        flags: {},
        arguments: []
      };
      this.__flags.forEach(flag => {
        result.flags[flag.getName()] = result.flags[flag.getHyphenatedName()] = flag.getValue();
      });
      this.__arguments.forEach(argument => {
        if (argument.getName())
          result.arguments[argument.getName()] = result.arguments[argument.getHyphenatedName()] = argument.getValue();
        result.arguments.push(argument.getValue());
      });
      return result;
    },

    /**
     * Adds an error message
     *
     * @param {String} msg
     */
    _error(msg) {
      if (!this.__errors) this.__errors = [];
      this.__errors.push(msg);
    },

    /**
     * Returns error messages
     *
     * @returns {String[]}
     */
    getErrors() {
      return this.__errors;
    },

    /**
     * Tests whether the string matches this command
     *
     * @param {String} arg
     * @returns {Boolean}
     */
    is(arg) {
      return arg == this.getName() || arg == this.getShortCode();
    },

    /**
     * Parses the command
     *
     * @param {String} cmdName the name
     * @param {Function} fnGetMore look ahead function
     * @returns {zx.cli.Command} the command to execute after parsing
     */
    parse(cmdName, fnGetMore) {
      let argvIndex = 0;
      function nextCmdName() {
        let value = fnGetMore(argvIndex++);
        if (value && value[0] == "-") value = null;
        if (value === null) argvIndex--;
        return value;
      }

      function fnGetMoreForChildren(index, reset) {
        let value = fnGetMore(argvIndex + index);
        if (reset) {
          argvIndex += index;
        }
        return value;
      }

      const parseArgument = (argument, value) => {
        try {
          argument.parse(value, fnGetMoreForChildren);
        } catch (ex) {
          this._error(ex.message);
        }
      };

      const parseFlag = (flag, value) => {
        try {
          flag.parse(value, fnGetMoreForChildren);
        } catch (ex) {
          this._error(ex.message);
        }
      };

      const findSubcommand = arg => {
        arg = qx.lang.String.camelCase(arg);
        for (let arr = this.__subcommands, i = 0; i < arr.length; i++) {
          let cmd = arr[i];
          if (cmd.is(arg)) return cmd;
        }
        return null;
      };

      const findFlag = arg => {
        for (let i = 0; i < this.__flags.length; i++) {
          let flag = this.__flags[i];
          if (flag.is(arg)) return flag;
        }
        return null;
      };

      let done = false;
      let finalCommand = this;
      let currentArgumentIndex = 0;
      let scanningForArguments = false;
      while (!done) {
        let value = fnGetMore(argvIndex++);
        if (!value) break;

        // Once we hit "--", then it's positional arguments only thereafter
        if (value == "--") {
          while ((value = fnGetMore(argvIndex++))) {
            if (currentArgumentIndex < this.__arguments.length) {
              let argument = this.__arguments[currentArgumentIndex++];
              parseArgument(argument, value);
            }
          }
          break;
        }

        // Is it a flag?
        if (value[0] == "-") {
          let flag = findFlag(value);
          if (!flag) throw Error(`Unrecognised flag ${value} passed to ${this}`);
          parseFlag(flag, value);
        } else {
          if (!scanningForArguments) {
            // Sub command processing
            let subcommand = findSubcommand(value);
            if (subcommand) finalCommand = subcommand.parse(value, fnGetMoreForChildren);

            // After a sub command, any argv that the subcommand has not consumed now
            //  belongs to our positional arguments
            scanningForArguments = true;
            if (subcommand) continue;
          }

          // Positional arguments
          if (currentArgumentIndex < this.__arguments.length) {
            let argument = this.__arguments[currentArgumentIndex++];
            parseArgument(argument, value);
          }
        }
      }

      let helpRequested = finalCommand.getFlag("help").getValue();
      if (!helpRequested) {
        // Check for missing mandatory arguments
        while (currentArgumentIndex < this.__arguments.length) {
          let argument = this.__arguments[currentArgumentIndex++];
          if (argument.isRequired()) {
            this._error(`Not enough positional arguments for ${this}`);
            break;
          }
        }

        // Check for missing mandatory flags
        Object.values(this.__flags).forEach(flag => {
          if (flag.isRequired() && flag.getValue() === null) this._error(`Missing value for ${flag}`);
        });
      }

      fnGetMore(argvIndex, true);

      // Return the command (or sub command) to execute
      return finalCommand;
    },

    toString() {
      return this.getName();
    }
  }
});
