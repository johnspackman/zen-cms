qx.Class.define("zx.test.util.Dates", {
  extend: qx.dev.unit.TestCase,

  members: {
    /**
     * Only detects a lost timezone offset when the process does not run in UTC, eg `TZ=Europe/Berlin`
     */
    testIsoRoundTrip() {
      const Dates = zx.utils.Dates;

      // midnight in Central Europe in winter and summer time, where a lost offset also changes the day
      let winter = new Date(Date.UTC(2027, 11, 30, 23, 0, 0, 0));
      let summer = new Date(Date.UTC(2027, 5, 30, 22, 30, 15, 7));

      this.assertEquals("2027-12-30T23:00:00.000Z", Dates.formatISO(winter));
      this.assertEquals(winter.getTime(), Dates.parseISO("2027-12-30T23:00:00.000Z").getTime());

      for (let dt of [winter, summer]) {
        this.assertEquals(dt.getTime(), Dates.parseISO(Dates.formatISO(dt)).getTime());
        this.assertEquals(dt.getTime(), zx.utils.Json.decodeJsonValue(zx.utils.Json.encodeJsonValue(dt)).getTime());
      }
    }
  }
});
