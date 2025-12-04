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
 *    Patryk Malinowski (@patryk-m-malinowski)
 *    John Spackman (john.spackman@zenesis.com, @johnspackman)
 *
 * ************************************************************************ */

/**
 * The session manager is responsible for keeping a registry of active sessions
 * and killing sessions which have been inactive for too long.
 */
qx.Class.define("zx.io.api.server.SessionManager", {
  extend: qx.core.Object,

  construct() {
    super();
    this.__sessionByUuid = {};

    if (zx.io.api.server.SessionManager.__instance) {
      throw new Error("zx.io.api.server.SessionManager is a singleton");
    }

    this.__killOldSessionsTimer = new zx.utils.Timeout(zx.io.api.server.SessionManager.KILL_OLD_SESSIONS_INTERVAL, this.__killOldSessions, this).set({
      recurring: false
    });
  },

  destruct() {
    if (zx.io.api.server.SessionManager.__instance === this) {
      zx.io.api.server.SessionManager.__instance = null;
    }
    this.__killOldSessionsTimer.dispose();
    this.__killOldSessionsTimer = null;
  },

  members: {
    /** @type {Object<String, zx.io.api.server.Session>} */
    __sessionByUuid: null,

    /**
     * Kills sessions which have been inactive for too long
     */
    __killOldSessions() {
      let sessions = new qx.data.Array(this.getAllSessions());
      for (let session of sessions) {
        if (new Date().getTime() - session.getLastActivity().getTime() > this.constructor.SESSION_TIMEOUT) {
          delete this.__sessionByUuid[session.toUuid()];
          session.destroy();
        }
      }
      if (!this.isEmpty()) {
        this.__killOldSessionsTimer.startTimer();
      }
    },

    shutdown() {
      for (let uuid in this.__sessionByUuid) {
        let session = this.__sessionByUuid[uuid];
        session.destroy();
      }
      this.__sessionByUuid = {};
    },

    /**
     * Returns a session by UUID
     *
     * @param {string} uuid
     * @returns {zx.io.api.server.Session}
     */
    getSessionByUuid(uuid) {
      return this.__sessionByUuid[uuid];
    },

    /**
     * Returns all sessions
     *
     * @returns {zx.io.api.server.Session[]}
     */
    getAllSessions() {
      return Object.values(this.__sessionByUuid);
    },

    /**
     * Adds a session to the registry
     *
     * @param {zx.io.api.server.Session} session
     */
    addSession(session) {
      let isFirst = !this.isEmpty();
      this.__sessionByUuid[session.toUuid()] = session;
      if (isFirst) {
        this.__killOldSessionsTimer.startTimer();
      }
    },

    /**
     * Removes a session from the registry
     *
     * @param {zx.io.api.server.Session} session
     */
    removeSession(session) {
      delete this.__sessionByUuid[session.toUuid()];
    },

    /**
     * Detects whether there are no sessions
     *
     * @returns {Boolean}
     */
    isEmpty() {
      return Object.keys(this.__sessionByUuid).length == 0;
    }
  },

  statics: {
    __instance: null,

    getInstance() {
      if (!zx.io.api.server.SessionManager.__instance) {
        zx.io.api.server.SessionManager.__instance = new zx.io.api.server.SessionManager();
      }
      return this.__instance;
    },

    /**
     * How often to look for and kill old sessions
     */
    KILL_OLD_SESSIONS_INTERVAL: 30000,

    /**
     * How inactive a session should be before it is killed
     */
    SESSION_TIMEOUT: 5 * 60 * 1000
  }
});
