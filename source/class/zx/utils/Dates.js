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

qx.Class.define("zx.utils.Dates", {
  extend: qx.core.Object,

  statics: {
    // For parsing ISO dates
    __DFISO: new qx.util.format.DateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),

    __MS_PER_SECOND: 1000,
    __MS_PER_MINUTE: 60 * 1000,
    __MS_PER_HOUR: 60 * 60 * 1000,
    __MS_PER_DAY: 24 * 60 * 60 * 1000,

    /**
     * Adds a number of months
     * @param dt
     * @param delta
     * @returns
     */
    addMonths(dt, delta) {
      var m = dt.getMonth() + delta;
      var y = dt.getFullYear();
      dt = new Date(dt.getTime());
      while (m < 0) {
        m += 12;
        y--;
      }
      while (m > 11) {
        m -= 12;
        y++;
      }
      dt.setMonth(m);
      dt.setFullYear(y);
      return dt;
    },

    /**
     * Adds a given number of days to the month
     * @param dt
     * @param delta
     * @returns
     */
    addDays(dt, delta) {
      var l = dt.getTime();
      l += delta * 24 * 60 * 60 * 1000;
      dt = new Date(l);
      return dt;
    },

    /**
     * Sets the time part to match that of another Date object; note that this modifies the
     * date object passed in
     *
     * @param {Date} dt the `Date` to modify
     * @param {Date} time the `Date` containing the time information
     * @returns {Date} the `dt`
     */
    setTimePart(dt, time) {
      dt.setHours(time.getHours());
      dt.setMinutes(time.getMinutes());
      dt.setSeconds(time.getSeconds());
      dt.setMilliseconds(time.getMilliseconds());
      return dt;
    },

    /**
     * Sets the date part to match that of another Date object; note that this modifies the
     * Date object passed in
     *
     * @param {Date} dt the `Date` to modify
     * @param {Date} time the `Date` containing the date information
     * @returns {Date} the `dt`
     */
    setDatePart(dt, date) {
      dt.setDate(date.getDate());
      dt.setMonth(date.getMonth());
      dt.setFullYear(date.getFullYear());
      return dt;
    },

    /**
     * Returns the number of days in a month
     * @param dt {Number|Date} the month (0-11) or date to check
     * @returns {Number}
     */
    getDaysInMonth(dt) {
      var month;
      if (typeof dt == "number") {
        month = dt;
      } else month = dt.getMonth();
      if (month == 0 || month == 2 || month == 4 || month == 6 || month == 7 || month == 9 || month == 11) {
        return 31;
      } else if (month == 1) {
        dt = new Date(dt.getYear(), 2, -1);
        return dt.getDate();
      } else return 30;
    },

    /**
     * Calculates the number of days difference between two dates
     * @param first
     * @param second
     * @returns
     */
    daysDifference(first, second) {
      var diff = this.zeroTime(first) - this.zeroTime(second);
      return Math.round(diff / this.__MS_PER_DAY);
    },

    /**
     * Tests whether the two dates are for the same day, ignoring the time
     * @param first
     * @param second
     * @returns {Boolean}
     */
    sameDay(first, second) {
      return first.getFullYear() == second.getFullYear() && first.getMonth() == second.getMonth() && first.getDate() == second.getDate();
    },

    /**
     * Tests whether the two dates are for the same month in the same year,
     * ignoring the time
     * @param first
     * @param second
     * @returns {Boolean}
     */
    sameMonth(first, second) {
      return first.getMonth() == second.getMonth() && first.getFullYear() == second.getFullYear();
    },

    /**
     * Calculates the number of whole months difference between two dates
     * @param first
     * @param second
     * @returns
     */
    monthsDifference(first, second) {
      var fm = first.getYear() * 12 + first.getMonth();
      var sm = second.getYear() * 12 + second.getMonth();
      var diff = sm - fm;
      var fd = first.getDate();
      var sd = second.getDate();
      if (fd > sd) {
        diff--;
      }
      return diff;
    },

    /**
     * Returns a date with zero time
     * @param dt
     */
    zeroTime(dt) {
      return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
    },

    /**
     * Returns a new date, count hours after dt
     */
    addHours(dt, count) {
      return new Date(dt.getTime() + count * this.__MS_PER_HOUR);
    },

    /**
     * Returns a new date, count minutes after dt
     */
    addMinutes(dt, count) {
      return new Date(dt.getTime() + count * this.__MS_PER_MINUTE);
    },

    /**
     * Returns a new date, count seconds after dt
     */
    addSeconds(dt, count) {
      return new Date(dt.getTime() + count * this.__MS_PER_SECOND);
    },

    /**
     * Returns the number of minutes between two date/times
     * @param first
     * @param second
     * @returns
     */
    minutesDifference(first, second) {
      var diff = second.getTime() - first.getTime();
      return Math.round(diff / this.__MS_PER_MINUTE);
    },

    /**
     * Returns a time period as number of weeks, days, hours, minutes, and seconds,
     * eg "2w1d3h4m59s"
     *
     * @param millis {Integer} time elapsed, in milliseconds
     * @param significance {Integer?} significance to represent, default is 2
     * @returns {String}
     */
    formatFrequency(time, significance) {
      if (qx.lang.Type.isDate(time)) {
        time = new Date().getTime() - time.getTime();
      } else if (qx.lang.Type.isString(time)) {
        time = parseInt(time, 10);
      } else if (!qx.lang.Type.isNumber(time)) {
        throw new Error("Cannot interpret milliseconds in grasshopper.utils.Dates.formatFrequency: time=" + time);
      }

      if (time == 0) {
        return "0s";
      }
      if (time < 1000) {
        return "1s";
      }
      if (!significance) {
        significance = 2;
      }
      time = Math.floor(time / 1000);

      let secs = time % 60;
      time = Math.floor((time - secs) / 60);

      let mins = time % 60;
      time = Math.floor((time - mins) / 60);

      let hours = time % 24;
      time = Math.floor((time - hours) / 24);

      let days = time % 7;
      time = Math.floor((time - days) / 7);

      let weeks = Math.floor(time);

      let segs = [weeks, days, hours, mins, secs];
      const UNITS = ["w", "d", "h", "m", "s"];
      let start = 0;
      while (start < segs.length && segs[start] == 0) {
        start++;
      }
      let str = "";
      for (let i = start; i < segs.length && i < start + significance; i++) {
        if (i - start >= significance) {
          break;
        }
        if (segs[i]) {
          str += segs[i] + UNITS[i];
        }
      }

      return str;
    },

    /**
     * Parses an ISO date time
     * @param str {String} the string to parse
     * @return Date the date, or null if str was null
     */
    parseISO(str) {
      if (!str) {
        return null;
      }
      var m = str.match(/([0-9]+)-([0-9]+)-([0-9]+)T([0-9]+):([0-9]+):([0-9]+).([0-9]+)Z/);

      if (!m) {
        return null;
      }
      var year = parseInt(m[1], 10),
        month = parseInt(m[2], 10) - 1,
        day = parseInt(m[3], 10),
        hours = parseInt(m[4], 10),
        minutes = parseInt(m[5], 10),
        seconds = parseInt(m[6], 10),
        millis = parseInt(m[7], 10);

      var dt = new Date(year, month, day, hours, minutes, seconds, millis);
      if (isNaN(dt.getYear())) {
        qx.log.Logger.warn("Could not parse date: str=" + str + ", m=" + JSON.stringify(m) + ", values=" + JSON.stringify([year, month, day, hours, minutes, seconds, millis]));

        return null;
      }
      /*
      Becaused Javascript is so unbelievably broken, all timezone information is ignored.
      When we work on the server, we tell node that the timezone is UTC+0, and when we work on the browser,
      we delete timezone information so that it is treated as UTC+0.

      This means that in summer time, the date is correct *provided that you ignore the time zone*

      var offset = dt.getTimezoneOffset();
      if (offset != 0) {
        dt = new Date(year, month, day, hours, minutes - offset, seconds, millis);

        if (isNaN(dt.getYear())) {
          qx.log.Logger.warn("Could not change date offset: str=" + str + ", offset=" + offset + ", m=" + JSON.stringify(m));

          return null;
        }
      }
      */
      return dt;
    },

    /**
     * Formats a date as ISO
     * @param dt {Date} the date to format
     * @return {String} the formatted datetime or null is dt was null
     */
    formatISO(dt) {
      /*
      if (!dt)
      return null;
      // The Date constructor assumes the date is in local timezone, but ISO is at GMT so we reverse the timezone difference
      dt = new Date(dt.getTime());
      dt.setMinutes(dt.getMinutes() + dt.getTimezoneOffset());
      return this.__DFISO.format(dt);
      */
      if (!dt) {
        return null;
      }
      function dp2(v) {
        if (v < 10) {
          return "0" + v;
        }
        return "" + v;
      }
      function dp3(v) {
        if (v < 10) {
          return "00" + v;
        }
        if (v < 100) {
          return "0" + v;
        }
        return "" + v;
      }
      var str =
        dt.getUTCFullYear() +
        "-" +
        dp2(dt.getUTCMonth() + 1) +
        "-" +
        dp2(dt.getUTCDate()) +
        "T" +
        dp2(dt.getUTCHours()) +
        ":" +
        dp2(dt.getUTCMinutes()) +
        ":" +
        dp2(dt.getUTCSeconds()) +
        "." +
        dp3(dt.getUTCMilliseconds()) +
        "Z";
      return str;
    },

    /**
     * Compares two dates and returns -1, 1, or 0 (ie suitable for array sort methods).  A null
     * date implies the other date will come first.  Newest date returns first
     *
     * @param l {Date}
     * @param r {Date}
     * @param {Integer} 0, 1, or -1
     */
    compareDates(ld, rd) {
      if (ld && !rd) {
        return -1;
      }
      if (rd && !ld) {
        return 1;
      }
      if (ld) {
        ld = ld.getTime();
        rd = rd.getTime();
        if (ld < rd) {
          return -1;
        }
        if (ld > rd) {
          return 1;
        }
      }
      return 0;
    },

    /**
     * Tests to see whether a date is between two other dates
     *
     * @param {Date} dt date to test
     * @param {Date?} start earliest date
     * @param {Date?} end latest date
     * @returns {Boolean}
     */
    between(dt, start, end) {
      if (start && this.compareDates(dt, start) < 0) {
        return false;
      }
      if (end && this.compareDates(dt, end) > 0) {
        return false;
      }
      return true;
    }
  }
});
