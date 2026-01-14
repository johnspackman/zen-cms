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

qx.Class.define("zx.utils.Values", {
  type: "static",

  statics: {
    /**
     * Converts a string into an identifier; this means lower case, and compressing any
     * non-identifier characters into a single '-'.  EG "My Amazing Story!!" becomes "my-amazing-story"
     *
     * @param {String} str
     * @returns {String}
     */
    toIdentifier(str) {
      str = str.trim().toLowerCase();
      let result = "";
      let lastC = 0;
      let lastWasInvalid = false;
      for (let i = 0; i < str.length; i++) {
        let c = str[i];
        if (c == "." && lastC == ".") {
          continue;
        }
        if (!this.isIdentifierCharacter(c)) {
          if (!lastWasInvalid && lastC != "-") {
            result += c = "-";
          }
          lastWasInvalid = true;
        } else {
          result += c;
          lastWasInvalid = false;
        }
        lastC = c;
      }

      // Strip leading '-'
      for (let i = 0; i < result.length; i++) {
        if (result[i] != "-") {
          if (i > 0) {
            result = result.substring(i);
          }
          break;
        }
      }

      // Strip trailing '-'
      for (let i = result.length - 1; i >= 0; i--) {
        if (result[i] != "-") {
          if (i < result.length - 1) {
            result = result.substring(0, i + 1);
          }
          break;
        }
      }

      return result;
    },

    /**
     * Replaces newline characters with <br/>
     * @param {string} str
     * @returns {string}
     */
    nl2br(str) {
      return str.replace(/\r\n|\n\r|\r|\n/g, "<br/>");
    },

    /**
     * Converts a value to a boolean
     *
     * @param value
     *          {Object|Number|String}
     * @return {Boolean}
     */
    toBoolean(value) {
      var type = typeof value;
      if (type == "boolean") {
        return value;
      }
      if (type == "undefined" || !value) {
        return false;
      }
      if (type == "number") {
        return value != 0;
      }
      var str = value.trim().toLowerCase();
      if (str == "true" || str == "yes" || str == "on" || str == "1") {
        return true;
      }
      if (str == "false" || str == "no" || str == "off" || str == "0") {
        return false;
      }
      if (!/[\-\+]?[0-9.]/.test(value)) {
        return false;
      }
      var intVal = parseInt(str);
      return !isNaN(intVal) && intVal != 0;
    },

    /**
     * Detects whether a value can be entirely converted into a boolean
     */
    isBoolean(value) {
      var type = typeof value;
      if (type == "undefined" || !value) {
        return false;
      }
      if (type == "number") {
        return true;
      }
      var str = value.trim().toLowerCase();
      if (str == "true" || str == "yes" || str == "on" || str == "1") {
        return true;
      }
      if (str == "false" || str == "no" || str == "off" || str == "0") {
        return true;
      }
      if (!/[\-\+]?[0-9.]/.test(value)) {
        return false;
      }
      var intVal = parseInt(str);
      return !isNaN(intVal);
    },

    /**
     * Tests whether a value is a float, or can be converted to one. Unlike the
     * native parseFloat, this requires the _entire_ string to be a float
     *
     * @param value
     *          the value to test
     * @param allowEmpty?
     *          {Boolean} true if empty value are considered a valid value
     */
    isFloat(value, allowEmpty) {
      if (value == null) {
        return false;
      }
      var type = typeof value;
      if (type == "number") {
        return true;
      }
      if (type != "string") {
        return false;
      }
      value = value.trim();
      if (value.length == 0) {
        return allowEmpty ? true : false;
      }
      if (!/^[\-\+]?[0-9.]+$/.test(value)) {
        return false;
      }
      return true;
    },

    /**
     * Converts a value into a float. Unlike the native parseFloat, this
     * requires the _entire_ string to be a float
     *
     * @param value
     *          the value to convert
     * @param defaultValue?
     *          the value to use if value cannot be converted
     * @return the floating point equivelant
     * @throws an
     *           exception if the value cannot be converted and defaultValue is
     *           null
     */
    toFloat(value, defaultValue) {
      if (!this.isFloat(value, false)) {
        if (defaultValue != null) {
          return defaultValue;
        }
        throw "Cannot convert value '" + value + "' to a float and no default provided";
      }
      return parseFloat(value);
    },

    /**
     * Tests whether a value is an integer, or can be converted to one. Unlike
     * the native parseInt, this requires the _entire_ string to be a int
     *
     * @param value
     *          the value to test
     * @param allowEmpty?
     *          {Boolean} true if empty value are considered a valid value
     */
    isInt(value, allowEmpty) {
      if (value == null) {
        return false;
      }
      var type = typeof value;
      if (type == "number") {
        return true;
      }
      if (type != "string") {
        return false;
      }
      value = value.trim();
      if (value.length == 0) {
        return allowEmpty ? true : false;
      }
      if (!/^[\-\+]?[0-9]+$/.test(value)) {
        return false;
      }
      return true;
    },

    /**
     * Converts a value into a integer. Unlike the native parseInt, this
     * requires the _entire_ string to be an int
     *
     * @param value
     *          the value to convert
     * @param defaultValue?
     *          the value to use if value cannot be converted
     * @return the integer equivelant
     * @throws an
     *           exception if the value cannot be converted and defaultValue is
     *           null
     */
    toInt(value, defaultValue) {
      if (!this.isInt(value, false)) {
        if (defaultValue != null) {
          return defaultValue;
        }
        throw "Cannot convert value '" + value + "' to an integer and no default provided";
      }
      return parseInt(value);
    },

    /**
     * Rounds a floating point number to a given number of places
     */
    round(value, numPlaces) {
      var multiplier = Math.pow(10, numPlaces);
      value = Math.round(value * multiplier);
      value /= multiplier;
      return value;
    },

    /**
     * Adds leading zeros to an integer until it is at least <code>width</code>
     * digits wide
     *
     * @param value
     * @param width
     * @returns
     */
    leadingZeros(value, width) {
      if (typeof value != "string") {
        value = "" + value;
      }
      while (value.length < width) {
        value = "0" + value;
      }
      return value;
    },

    /**
     * Checks whether a character is an integer
     *
     * @param ch
     *          {Character} the character to test
     * @return {Boolean}
     */
    isDigit(ch) {
      // var i = parseInt(ch);
      // return !isNaN(i) && i >= 0 && i <= 9;
      var cc = !ch ? 0 : ch.charCodeAt(0);
      return cc >= 0x30 && cc <= 0x39;
    },

    /**
     * Checks whether a character is whitespace
     *
     * @param ch
     *          {Character} the character to test
     * @return {Boolean}
     */
    isWhitespace(ch) {
      var cc = !ch ? 0 : ch.charCodeAt(0);
      return cc == 32 || cc == 9 || cc == 10 || cc == 13;
    },

    /**
     * Checks whether a character is a letter
     *
     * @param ch
     *          {Character} the character to test
     * @return {Boolean}
     */
    isLetter(c) {
      var cc = !c ? 0 : c.charCodeAt(0);
      return (cc >= 0x41 && cc <= 0x5a) || (cc >= 0x61 && cc <= 0x7a);
    },

    /**
     * Checks whether the character is a letter or a digit
     *
     * @param c
     * @return {Boolean}
     */
    isAlphaNum(c) {
      return this.isLetter(c) || this.isDigit(c);
    },

    /**
     * Checks whether the character is an identifier character
     *
     * @param c
     * @return {Boolean}
     */
    isIdentifierCharacter(c) {
      return this.isLetter(c) || this.isDigit(c) || "_-.".indexOf(c) > -1;
    },

    /**
     * Checks whether a character is an upper case character
     *
     * @param ch
     *          {Character} the character to test
     * @return {Boolean}
     */
    isUpperCase(c) {
      var cc = !c ? 0 : c.charCodeAt(0);
      return cc >= 0x41 && cc <= 0x5a;
    },

    /**
     * Checks whether a character is a lower case character
     *
     * @param ch
     *          {Character} the character to test
     * @return {Boolean}
     */
    isLowerCase(c) {
      var cc = !c ? 0 : c.charCodeAt(0);
      return cc >= 0x61 && cc <= 0x7a;
    },

    /**
     * Checks whether a character is a punctuation character
     *
     * @param ch
     *          {Character} the character to test
     * @return {Boolean}
     */
    isPunctuation(c) {
      var cc = !c ? 0 : c.charCodeAt(0);
      return (cc >= 20 && cc <= 0x2f) || (cc >= 0x3a && cc <= 0x40) || (cc >= 0x5b && cc <= 0x60) || (cc >= 0x7b && cc <= 0x7e);
    },

    /**
     * Checks whether the string is a valid email address
     *
     * @param emailStr
     * @returns
     */
    isValidEmail(emailStr) {
      if (!emailStr || !emailStr.length) {
        return false;
      }

      /* CHECK tld on 1;off 0 */
      var checkTLD = 0;

      /* Known tlds */

      var knownDomsPat = /^(com|net|org|edu|int|mil|gov|arpa|biz|aero|name|coop|info|pro|museum)$/;

      /*
       * The following pattern is used to check if the entered e-mail address
       * fits the user@domain format. It also is used to separate the username
       * from the domain.
       */

      var emailPat = /^(.+)@(.+)$/;

      /*
       * The following string represents the pattern for matching all special
       * characters. We don't want to allow special characters in the address.
       * These characters include ( ) < > @ , ; : \ " . [ ]
       */

      var specialChars = '\\(\\)><@,;:\\\\\\"\\.\\[\\]';

      /*
       * The following string represents the range of characters allowed in a
       * username or domainname. It really states which chars aren't allowed.
       */

      var validChars = "[^\\s" + specialChars + "]";

      /*
       * The following pattern applies if the "user" is a quoted string (in
       * which case, there are no rules about which characters are allowed and
       * which aren't; anything goes). E.g. "jiminy cricket"@disney.com is a
       * legal e-mail address.
       */

      var quotedUser = '("[^"]*")';

      /*
       * The following pattern applies for domains that are IP addresses, rather
       * than symbolic names. E.g. joe@[123.124.233.4] is a legal e-mail
       * address. NOTE: The square brackets are required.
       */

      var ipDomainPat = /^\[(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\]$/;

      /*
       * The following string represents an atom (basically a series of
       * non-special characters.)
       */

      var atom = validChars + "+";

      /*
       * The following string represents one word in the typical username. For
       * example, in john.doe@somewhere.com, john and doe are words. Basically,
       * a word is either an atom or quoted string.
       */

      var word = "(" + atom + "|" + quotedUser + ")";

      // The following pattern describes the structure of
      // the user

      var userPat = new RegExp("^" + word + "(\\." + word + ")*$");

      /*
       * The following pattern describes the structure of a normal symbolic
       * domain, as opposed to ipDomainPat, shown above.
       */

      var domainPat = new RegExp("^" + atom + "(\\." + atom + ")*$");

      /*
       * Finally, let's start trying to figure out if the supplied address is
       * valid.
       */

      /*
       * Begin with the coarse pattern to simply break up user@domain into
       * different pieces that are easy to analyze.
       */

      var matchArray = emailStr.match(emailPat);

      // Nowhere near a match
      if (matchArray == null) {
        return false;
      }

      var user = matchArray[1];
      var domain = matchArray[2];

      // Start by checking that only basic ASCII
      // characters are in the strings
      // (0-127).
      for (var i = 0; i < user.length; i++) {
        if (user.charCodeAt(i) > 127) {
          return false;
        }
      }
      for (var i = 0; i < domain.length; i++) {
        if (domain.charCodeAt(i) > 127) {
          return false;
        }
      }

      // See if "user" is valid
      if (user.match(userPat) == null) {
        return false;
      }

      /*
       * if the e-mail address is at an IP address (as opposed to a symbolic
       * host name) make sure the IP address is valid.
       */
      var IPArray = domain.match(ipDomainPat);
      if (IPArray != null) {
        // this is an IP address
        for (var i = 1; i <= 4; i++) {
          if (IPArray[i] > 255) {
            return false;
          }
        }
        return true;
      }

      // Domain is symbolic name. Check if it's valid.
      var atomPat = new RegExp("^" + atom + "$");
      var domArr = domain.split(".");
      var len = domArr.length;
      for (i = 0; i < len; i++) {
        if (domArr[i].search(atomPat) == -1) {
          return false;
        }
      }

      /*
       * domain name seems valid, but now make sure that it ends in a known
       * top-level domain (like com, edu, gov) or a two-letter word,
       * representing country (uk, nl), and that there's a hostname preceding
       * the domain or country.
       */
      if (checkTLD == 1 && domArr[domArr.length - 1].length != 2 && domArr[domArr.length - 1].search(knownDomsPat) == -1) {
        return false;
      }

      // Make sure there's a host name preceding the domain.
      if (len < 2) {
        return false;
      }

      // If we've gotten this far, everything's valid!
      return true;
    },

    /**
     * Detects whether the strong contains valid emails, separated by comma or
     * semi colon
     *
     * @param emails
     * @returns
     */
    isValidEmails(emails) {
      if (!emails || typeof emails != "string") {
        return false;
      }

      var list = emails.split(/[,;\s]+/);
      var ok = false;
      for (var i = 0; i < list.length; i++) {
        if (!list[i]) {
          continue;
        } else if (!this.isValidEmail(list[i])) {
          return false;
        } else ok = true;
      }
      return ok;
    },

    /**
     * Detects whether the object is a Qooxdoo class
     */
    isClass(clz) {
      return clz && clz.$$type !== undefined && clz.$$type === "Class";
    },

    /**
     * Expands a filename into path, name, and extension
     *
     * @param path {String}
     * @return {Object} contains
     * path {String} directory of the file, including trailing /
     * name {String} name of the file, excluding extension and excluding "."
     * fullName {String} name of the file, including extension
     * ext {String} extension including "."
     */
    expandFilename(path) {
      if (!path) {
        return null;
      }
      var m = path.match(/^((.*)[\\\/])?([^\\\/]+)(\.[^.\\\/]+)$/);
      if (m) {
        return {
          path: m[1] || "",
          name: m[3],
          ext: m[4],
          fullName: m[3] + m[4]
        };
      }
      return {
        path: "",
        name: path,
        fullName: path,
        ext: ""
      };
    },

    /**
     * Returns information for the property referenced by path; path can contain
     * dotted-notation to decend into the object's properties.
     *
     * @param obj
     * @param path
     * @returns {Map} A map, containing:
     * original: the obj passed to this function
     * object: the object that contains the property
     * propName: the name of the property
     * propDef: the definition of the property
     * get: getMethod
     * set: setMethod
     */
    getPropertyInfo(obj, path) {
      function arrayGet(arr, index) {
        return arr instanceof qx.data.Array ? arr.getItem(index) : arr[index];
      }
      function arraySet(arr, index, value) {
        if (arr instanceof qx.data.Array) {
          arr.setItem(index, value);
        } else arr[index] = value;
      }
      if (obj === null) {
        return null;
      }
      var result = {
        original: obj
      };

      var segs = path.split(".");
      for (var i = 0; i < segs.length - 1; i++) {
        var seg = segs[i];
        var index = -1;
        var pos = seg.indexOf("[");
        if (pos > 0) {
          index = seg.substring(pos + 1, seg.length - 1);
          seg = seg.substring(0, pos);
        }
        var upname = qx.lang.String.firstUp(seg);
        obj = obj["get" + upname]();
        if (obj == null) {
          return null;
        }
        if (index > -1) {
          obj = arrayGet(obj, index);
          if (obj == null) {
            return null;
          }
        }
      }
      result.object = obj;
      result.propName = segs[segs.length - 1];
      result.propDef = qx.Class.getPropertyDefinition(obj.constructor, result.propName);

      var seg = segs[i];
      var pos = seg.indexOf("[");
      if (pos > 0) {
        index = seg.substring(pos + 1, seg.length - 1);
        seg = seg.substring(0, pos);
        var upname = qx.lang.String.firstUp(seg);
        if (obj["get" + upname] === undefined) {
          console.error("Cannot find accessor 'get" + upname + "' in " + path + " for " + obj);
          return null;
        }

        result.get = function () {
          return (obj = arrayGet(obj["get" + upname].call(obj), index));
        };
        result.set = function (value) {
          arraySet(obj["get" + upname].call(obj), index, value);
        };
      } else {
        var upname = qx.lang.String.firstUp(seg);
        if (typeof obj["get" + upname] == "function") {
          result.get = qx.lang.Function.bind(obj["get" + upname], obj);
        } else if (typeof obj["is" + upname] == "function") {
          result.get = qx.lang.Function.bind(obj["is" + upname], obj);
        } else throw new Error("Cannot find a getter for " + upname);
        if (typeof obj["get" + upname + "Async"] == "function") {
          result.getAsync = qx.lang.Function.bind(obj["get" + upname + "Async"], obj);
        }
        if (typeof obj["set" + upname] == "function") {
          result.set = qx.lang.Function.bind(obj["set" + upname], obj);
        }
        if (typeof obj["set" + upname + "Async"] == "function") {
          result.setAsync = qx.lang.Function.bind(obj["set" + upname + "Async"], obj);
        }
      }
      return result;
    },

    /**
     * Inverse of setValue, although does no conversion etc
     *
     * @param model
     * @param propName
     * @returns
     */
    getValue(model, propName) {
      if (!propName) {
        return model;
      }
      var len = propName.length;
      if (len > 1 && propName.charAt(0) == "'" && propName.charAt(len - 1) == "'") {
        return propName.substring(1, len - 1);
      }

      var propInfo = this.getPropertyInfo(model, propName);
      if (propInfo === null) {
        return null;
      }
      return propInfo.get();
    },

    /**
     * Inverse of setValue, although does no conversion etc
     *
     * @param model
     * @param propName
     * @returns
     */
    async getValueAsync(model, propName) {
      if (!propName) {
        return model;
      }
      var len = propName.length;
      if (len > 1 && propName.charAt(0) == "'" && propName.charAt(len - 1) == "'") {
        return propName.substring(1, len - 1);
      }

      var propInfo = this.getPropertyInfo(model, propName);
      if (propInfo === null) {
        return null;
      }
      if (propInfo.getAsync) {
        return await propInfo.getAsync();
      }
      return propInfo.get();
    },

    /**
     * Sets the property named propName on the object model to value. Returns
     * true if the value was changed
     *
     * @param model
     * @param propName
     * @param value
     * @returns
     */
    setValue(model, propName, value, options) {
      var len = propName.length;
      if (len > 1 && propName.charAt(0) == "'" && propName.charAt(len - 1) == "'") {
        return;
      }

      var propInfo = this.getPropertyInfo(model, propName);
      if (!propInfo) {
        return;
      }
      value = this.convertForModel(propInfo, value, options);
      propInfo.set(value);
      return true;
    },

    /**
     * Sets the property named propName on the object model to value. Returns
     * true if the value was changed
     *
     * @param model
     * @param propName
     * @param value
     * @returns
     */
    async setValueAsync(model, propName, value, options) {
      var len = propName.length;
      if (len > 1 && propName.charAt(0) == "'" && propName.charAt(len - 1) == "'") {
        return;
      }

      var propInfo = this.getPropertyInfo(model, propName);
      if (!propInfo) {
        return;
      }
      value = this.convertForModel(propInfo, value, options);
      if (propInfo.setAsync) {
        await propInfo.setAsync(value);
      } else propInfo.set(value);
      return true;
    },

    /**
     * Finds the element in the array which has a specific property value
     *
     * @param model
     * @param path
     * @param value
     * @returns
     */
    lookupValue(model, path, value) {
      if (!model) {
        return null;
      }
      for (var i = 0; i < model.getLength(); i++) {
        var item = model.getItem(i);
        var itemValue = this.getValue(item, path);
        if (itemValue == value) {
          return item;
        }
      }
      return null;
    },

    /**
     * Converts the value into a form suitable to applying to the object
     * property specified in propInfo
     *
     * @param propInfo
     * @param value
     * @returns
     */
    convertForModel(propInfo, value, options) {
      var propDef = propInfo.propDef;
      if (propDef && propDef.check) {
        if (typeof value == "String") {
          if (propDef.check == "Integer" || propDef.check == "PositiveInteger") {
            value = parseInt(value);
            if (isNaN(value)) {
              value = 0;
            }
          } else if (propDef.check == "Number" || propDef.check == "PositiveNumber") {
            value = parseFloat(value);
            if (isNaN(value)) {
              value = 0;
            }
          } else if (propDef.check == "Date") {
            var df = null;
            if (options && options.dateFormat) {
              df = options.dateFormat;
            } else if (qx.Class.isSubClassOf(propInfo.object.constructor, qx.ui.form.IDateForm)) {
              df = propInfo.object.getDateFormat();
            }
            if (!df) {
              df = qx.util.format.DateFormat.getDateInstance();
            }
            value = df.parse(value);
          }
        }
      }
      return value;
    },

    /**
     * Performs a binary search on the host array.
     *
     * Thanks to Oliver Caldwell for this snippet, https://oli.me.uk/2013/06/08/searching-javascript-arrays-with-a-binary-search/
     *
     * @param {*} array The array to search.
     * @param {*} searchElement The item to search for within the array.
     * @return {Number} The index of the element which defaults to -1 when not found.
     */
    binaryIndexOf(array, searchElement) {
      var minIndex = 0;
      var maxIndex = array.length - 1;
      var currentIndex;
      var currentElement;

      while (minIndex <= maxIndex) {
        currentIndex = ((minIndex + maxIndex) / 2) | 0;
        currentElement = array[currentIndex];

        if (currentElement < searchElement) {
          minIndex = currentIndex + 1;
        } else if (currentElement > searchElement) {
          maxIndex = currentIndex - 1;
        } else {
          return currentIndex;
        }
      }

      return -1;
    },

    binaryStartsWith(array, searchElement) {
      var minIndex = 0;
      var maxIndex = array.length - 1;
      var currentIndex;
      var currentElement;

      while (minIndex <= maxIndex) {
        currentIndex = ((minIndex + maxIndex) / 2) | 0;
        currentElement = array[currentIndex];

        if (currentElement.startsWith(searchElement)) {
          while (currentIndex > 0) {
            if (!array[currentIndex - 1].startsWith(searchElement)) {
              break;
            }
            currentIndex--;
          }
          return currentIndex;
        }
        if (currentElement < searchElement) {
          minIndex = currentIndex + 1;
        } else if (currentElement > searchElement) {
          maxIndex = currentIndex - 1;
        }
      }

      return -1;
    },

    sprintf: null,
    vsprintf: null
  }
});

(function () {
  /**
   * sprintf() for JavaScript 0.7-beta1
   * http://www.diveintojavascript.com/projects/javascript-sprintf
   *
   * Copyright (c) Alexandru Marasteanu <alexaholic [at) gmail (dot] com> All
   * rights reserved.
   *
   * Redistribution and use in source and binary forms, with or without
   * modification, are permitted provided that the following conditions are met:
   * Redistributions of source code must retain the above copyright notice, this
   * list of conditions and the following disclaimer. Redistributions in binary
   * form must reproduce the above copyright notice, this list of conditions and
   * the following disclaimer in the documentation and/or other materials
   * provided with the distribution. Neither the name of sprintf() for
   * JavaScript nor the names of its contributors may be used to endorse or
   * promote products derived from this software without specific prior written
   * permission.
   *
   * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
   * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
   * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
   * ARE DISCLAIMED. IN NO EVENT SHALL Alexandru Marasteanu BE LIABLE FOR ANY
   * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
   * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
   * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
   * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
   * LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY
   * OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH
   * DAMAGE.
   *
   *
   * Changelog: 2010.09.06 - 0.7-beta1 - features: vsprintf, support for named
   * placeholders - enhancements: format cache, reduced global namespace
   * pollution
   *
   * 2010.05.22 - 0.6: - reverted to 0.4 and fixed the bug regarding the sign of
   * the number 0 Note: Thanks to Raphael Pigulla <raph (at] n3rd [dot) org>
   * (http://www.n3rd.org/) who warned me about a bug in 0.5, I discovered that
   * the last update was a regress. I appologize for that.
   *
   * 2010.05.09 - 0.5: - bug fix: 0 is now preceeded with a + sign - bug fix:
   * the sign was not at the right position on padded results (Kamal Abdali) -
   * switched from GPL to BSD license
   *
   * 2007.10.21 - 0.4: - unit test and patch (David Baird)
   *
   * 2007.09.17 - 0.3: - bug fix: no longer throws exception on empty
   * paramenters (Hans Pufal)
   *
   * 2007.09.11 - 0.2: - feature: added argument swapping
   *
   * 2007.04.03 - 0.1: - initial release
   */

  var sprintf = (function () {
    function get_type(variable) {
      return Object.prototype.toString.call(variable).slice(8, -1).toLowerCase();
    }
    function str_repeat(input, multiplier) {
      for (var output = []; multiplier > 0; output[--multiplier] = input) {
        /*
         * do
         * nothing
         */
      }
      return output.join("");
    }

    var str_format = function () {
      if (!str_format.cache.hasOwnProperty(arguments[0])) {
        str_format.cache[arguments[0]] = str_format.parse(arguments[0]);
      }
      return str_format.format.call(null, str_format.cache[arguments[0]], arguments);
    };

    str_format.format = function (parse_tree, argv) {
      var cursor = 1,
        tree_length = parse_tree.length,
        node_type = "",
        arg,
        output = [],
        i,
        k,
        match,
        pad,
        pad_character,
        pad_length;
      for (i = 0; i < tree_length; i++) {
        node_type = get_type(parse_tree[i]);
        if (node_type === "string") {
          output.push(parse_tree[i]);
        } else if (node_type === "array") {
          match = parse_tree[i]; // convenience purposes only
          if (match[2]) {
            // keyword argument
            arg = argv[cursor];
            for (k = 0; k < match[2].length; k++) {
              if (!arg.hasOwnProperty(match[2][k])) {
                throw sprintf('[sprintf] property "%s" does not exist', match[2][k]);
              }
              arg = arg[match[2][k]];
            }
          } else if (match[1]) {
            // positional argument (explicit)
            arg = argv[match[1]];
          } else {
            // positional argument (implicit)
            arg = argv[cursor++];
          }

          if (/[^s]/.test(match[8]) && get_type(arg) != "number") {
            throw sprintf("[sprintf] expecting number but found %s", get_type(arg));
          }
          switch (match[8]) {
            case "b":
              arg = arg.toString(2);
              break;
            case "c":
              arg = String.fromCharCode(arg);
              break;
            case "d":
              arg = parseInt(arg, 10);
              break;
            case "e":
              arg = match[7] ? arg.toExponential(match[7]) : arg.toExponential();
              break;
            case "f":
              arg = match[7] ? parseFloat(arg).toFixed(match[7]) : parseFloat(arg);
              break;
            case "o":
              arg = arg.toString(8);
              break;
            case "s":
              arg = (arg = String(arg)) && match[7] ? arg.substring(0, match[7]) : arg;
              break;
            case "u":
              arg = Math.abs(arg);
              break;
            case "x":
              arg = arg.toString(16);
              break;
            case "X":
              arg = arg.toString(16).toUpperCase();
              break;
          }

          arg = /[def]/.test(match[8]) && match[3] && arg >= 0 ? "+" + arg : arg;
          pad_character = match[4] ? (match[4] == "0" ? "0" : match[4].charAt(1)) : " ";
          pad_length = match[6] - String(arg).length;
          pad = match[6] ? str_repeat(pad_character, pad_length) : "";
          output.push(match[5] ? arg + pad : pad + arg);
        }
      }
      return output.join("");
    };

    str_format.cache = {};

    str_format.parse = function (fmt) {
      var _fmt = fmt,
        match = [],
        parse_tree = [],
        arg_names = 0;
      while (_fmt) {
        if ((match = /^[^\x25]+/.exec(_fmt)) !== null) {
          parse_tree.push(match[0]);
        } else if ((match = /^\x25{2}/.exec(_fmt)) !== null) {
          parse_tree.push("%");
        } else if ((match = /^\x25(?:([1-9]\d*)\$|\(([^\)]+)\))?(\+)?(0|'[^$])?(-)?(\d+)?(?:\.(\d+))?([b-fosuxX])/.exec(_fmt)) !== null) {
          if (match[2]) {
            arg_names |= 1;
            var field_list = [],
              replacement_field = match[2],
              field_match = [];
            if ((field_match = /^([a-z_][a-z_\d]*)/i.exec(replacement_field)) !== null) {
              field_list.push(field_match[1]);
              while ((replacement_field = replacement_field.substring(field_match[0].length)) !== "") {
                if ((field_match = /^\.([a-z_][a-z_\d]*)/i.exec(replacement_field)) !== null) {
                  field_list.push(field_match[1]);
                } else if ((field_match = /^\[(\d+)\]/.exec(replacement_field)) !== null) {
                  field_list.push(field_match[1]);
                } else {
                  throw "[sprintf] huh?";
                }
              }
            } else {
              throw "[sprintf] huh?";
            }
            match[2] = field_list;
          } else {
            arg_names |= 2;
          }
          if (arg_names === 3) {
            throw "[sprintf] mixing positional and named placeholders is not (yet) supported";
          }
          parse_tree.push(match);
        } else {
          throw "[sprintf] huh?";
        }
        _fmt = _fmt.substring(match[0].length);
      }
      return parse_tree;
    };

    return str_format;
  })();

  var vsprintf = function (fmt, argv) {
    argv.unshift(fmt);
    return sprintf.apply(null, argv);
  };

  /*
   * Patch to add [v]sprintf into zx.utils.Values
   */
  zx.utils.Values.sprintf = sprintf;
  zx.utils.Values.vsprintf = vsprintf;
})();
