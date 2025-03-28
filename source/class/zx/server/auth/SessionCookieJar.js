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

/**
 * Store for tough-cookie that stores the cookies in the request session.
 * The implementation is based heavily on the MemoryCookieStore in
 * https://github.com/salesforce/tough-cookie/blob/master/lib/memstore.js, hence the
 * verbatim reproduction of the header and licence agreement.
 */
qx.Class.define("zx.server.auth.SessionCookieJar", {
  extend: qx.core.Object,

  statics: {
    SessionCookieJarStoreClass: null
  }
});

/*!
 * Copyright (c) 2015, Salesforce.com, Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice,
 * this list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 * this list of conditions and the following disclaimer in the documentation
 * and/or other materials provided with the distribution.
 *
 * 3. Neither the name of Salesforce.com nor the names of its contributors may
 * be used to endorse or promote products derived from this software without
 * specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */
("use strict");
const toughCookie = require("tough-cookie");
const { Store, permuteDomain, pathMatch } = toughCookie;
const util = require("util");

class SessionCookieStore extends Store {
  constructor(req) {
    super();
    req.cookieStore = this;
    this.req = req;
    this.synchronous = true;
    this.idx = {};
    if (util.inspect.custom) {
      this[util.inspect.custom] = this.inspect;
    }
    this.loadCookies();
  }

  inspect() {
    return `{ idx: ${util.inspect(this.idx, false, 2)} }`;
  }

  findCookie(domain, path, key, cb) {
    if (!this.idx[domain]) {
      return cb(null, undefined);
    }
    if (!this.idx[domain][path]) {
      return cb(null, undefined);
    }
    return cb(null, this.idx[domain][path][key] || null);
  }
  findCookies(domain, path, allowSpecialUseDomain, cb) {
    const results = [];
    if (typeof allowSpecialUseDomain === "function") {
      cb = allowSpecialUseDomain;
      allowSpecialUseDomain = false;
    }
    if (!domain) {
      return cb(null, []);
    }

    let pathMatcher;
    if (!path) {
      // null means "all paths"
      pathMatcher = function matchAll(domainIndex) {
        for (const curPath in domainIndex) {
          const pathIndex = domainIndex[curPath];
          for (const key in pathIndex) {
            results.push(pathIndex[key]);
          }
        }
      };
    } else {
      pathMatcher = function matchRFC(domainIndex) {
        //NOTE: we should use path-match algorithm from S5.1.4 here
        //(see : https://github.com/ChromiumWebApps/chromium/blob/b3d3b4da8bb94c1b2e061600df106d590fda3620/net/cookies/canonical_cookie.cc#L299)
        Object.keys(domainIndex).forEach(cookiePath => {
          if (pathMatch(path, cookiePath)) {
            const pathIndex = domainIndex[cookiePath];

            for (const key in pathIndex) {
              results.push(pathIndex[key]);
            }
          }
        });
      };
    }

    const domains = permuteDomain(domain, allowSpecialUseDomain) || [domain];
    const idx = this.idx;
    domains.forEach(curDomain => {
      const domainIndex = idx[curDomain];
      if (!domainIndex) {
        return;
      }
      pathMatcher(domainIndex);
    });

    cb(null, results);
  }

  putCookie(cookie, cb) {
    this._putCookieImpl(cookie);
    this.saveCookies();
    cb(null);
  }

  updateCookie(oldCookie, newCookie, cb) {
    // updateCookie() may avoid updating cookies that are identical.  For example,
    // lastAccessed may not be important to some stores and an equality
    // comparison could exclude that field.
    this.putCookie(newCookie, cb);
  }

  removeCookie(domain, path, key, cb) {
    if (this.idx[domain] && this.idx[domain][path] && this.idx[domain][path][key]) {
      delete this.idx[domain][path][key];
    }
    this.saveCookies();
    cb(null);
  }
  removeCookies(domain, path, cb) {
    if (this.idx[domain]) {
      if (path) {
        delete this.idx[domain][path];
      } else {
        delete this.idx[domain];
      }
    }
    this.saveCookies();
    return cb(null);
  }

  removeAllCookies(cb) {
    this.idx = {};
    this.saveCookies();
    return cb(null);
  }

  getAllCookies(cb) {
    const cookies = this.getAllCookiesSync();
    cb(null, cookies);
  }

  getAllCookiesSync() {
    const idx = this.idx;
    const cookies = [];

    const domains = Object.keys(idx);
    domains.forEach(domain => {
      const paths = Object.keys(idx[domain]);
      paths.forEach(path => {
        const keys = Object.keys(idx[domain][path]);
        keys.forEach(key => {
          if (key !== null) {
            cookies.push(idx[domain][path][key]);
          }
        });
      });
    });

    // Sort by creationIndex so deserializing retains the creation order.
    // When implementing your own store, this SHOULD retain the order too
    cookies.sort((a, b) => {
      return (a.creationIndex || 0) - (b.creationIndex || 0);
    });

    return cookies;
  }

  _putCookieImpl(cookie) {
    if (!this.idx[cookie.domain]) {
      this.idx[cookie.domain] = {};
    }
    if (!this.idx[cookie.domain][cookie.path]) {
      this.idx[cookie.domain][cookie.path] = {};
    }
    this.idx[cookie.domain][cookie.path][cookie.key] = cookie;
  }

  loadCookies() {
    this.idx = {};
    let cookieJson = this.req.session && this.req.session.qx && this.req.session.qx.cookies;
    if (cookieJson) {
      for (var domainName in cookieJson) {
        for (var pathName in cookieJson[domainName]) {
          for (var cookieName in cookieJson[domainName][pathName]) {
            let cookie = toughCookie.fromJSON(JSON.stringify(cookieJson[domainName][pathName][cookieName]));

            this._putCookieImpl(cookie);
          }
        }
      }
    }
  }

  saveCookies() {
    if (!this.req.session) {
      throw new Error("No session available to store cookies");
    }
    if (!this.req.session.qx) {
      this.req.session.qx = {};
    }
    this.req.session.qx.cookies = qx.lang.Object.clone(this.idx, true);
  }
}

zx.server.auth.SessionCookieJar.SessionCookieJarStoreClass = SessionCookieStore;
