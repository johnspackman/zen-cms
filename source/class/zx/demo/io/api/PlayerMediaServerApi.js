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
 *    Patryk Malinowski (@patryk-m-malinowski)
 *
 * ************************************************************************ */

/**
 * Example of a server API used to control a video player connected to a TV.
 */
qx.Class.define("zx.demo.io.api.PlayerMediaServerApi", {
  extend: zx.io.api.server.AbstractServerApi,
  construct() {
    super("zx.demo.io.api.PlayerMediaApi");

    this.__interval = setInterval(() => {
      this.publish("playingMedia", this.__currentMedia++);
    }, 1000);

    //example addresses: localhost:8090/zx-api/player/media/playMedia/22
    //localhost:8090/zx-api/player/media/testmethod
    //localhost:8090/zx-api/player/media/getCurrentMedia

    this._registerGet("playMedia/{id}", (req, res) => {
      this.playMedia(req.getPathArgs().id);
      res.addData({ message: "success" });
    });
    this._registerGet("getCurrentMedia", async (req, res) => {
      let media = await this.getCurrentMedia();
      res.addData({ currentMedia: media });
    });
    this._registerGet("testMethod", (req, res) => {
      res.addData({ message: this.testMethod() });
    });
  },

  members: {
    /**@override */
    _publications: {
      /**
       * @type {number}
       */
      playingMedia: 0
    },

    __currentMedia: 7,

    getCurrentMedia() {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve(this.__currentMedia);
        }, 200);
      });
    },

    /**
     * @param {number} req
     */
    playMedia(id) {
      console.log(`called playMedia with id ${id}`);
      this.__currentMedia = id;
    },

    testMethod() {
      return "pigs";
    }
  }
});
