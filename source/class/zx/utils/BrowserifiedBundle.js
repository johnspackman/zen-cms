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

qx.Class.define("zx.utils.BrowserifiedBundle", {
  extend: qx.core.Object,

  statics: {
    shajs: null, // The "sha.js" module
    buffer: null,
    safeBuffer: null,

    initialise(module) {
      Object.keys(module).forEach(key => (zx.utils.BrowserifiedBundle[key] = module[key]));
    }
  }
});

/**
 * @require(ignore)
 */
(function () {
  function r(e, n, t) {
    function o(i, f) {
      if (!n[i]) {
        if (!e[i]) {
          var c = "function" == typeof require && require;
          if (!f && c) {
            return c(i, !0);
          }
          if (u) {
            return u(i, !0);
          }
          var a = new Error("Cannot find module '" + i + "'");
          throw ((a.code = "MODULE_NOT_FOUND"), a);
        }
        var p = (n[i] = { exports: {} });
        e[i][0].call(
          p.exports,
          function (r) {
            var n = e[i][1][r];
            return o(n || r);
          },
          p,
          p.exports,
          r,
          e,
          n,
          t
        );
      }
      return n[i].exports;
    }
    for (var u = "function" == typeof require && require, i = 0; i < t.length; i++) {
      o(t[i]);
    }
    return o;
  }
  return r;
})()(
  {
    1: [
      function (require, module, exports) {
        if (typeof Object.create === "function") {
          // implementation from standard node.js 'util' module
          module.exports = function inherits(ctor, superCtor) {
            ctor.super_ = superCtor;
            ctor.prototype = Object.create(superCtor.prototype, {
              constructor: {
                value: ctor,
                enumerable: false,
                writable: true,
                configurable: true
              }
            });
          };
        } else {
          // old school shim for old browsers
          module.exports = function inherits(ctor, superCtor) {
            ctor.super_ = superCtor;
            var TempCtor = function () {};
            TempCtor.prototype = superCtor.prototype;
            ctor.prototype = new TempCtor();
            ctor.prototype.constructor = ctor;
          };
        }
      },
      {}
    ],

    2: [
      function (require, module, exports) {
        /* eslint-disable node/no-deprecated-api */
        var buffer = require("buffer");
        var Buffer = buffer.Buffer;

        // alternative to using Object.keys for old browsers
        function copyProps(src, dst) {
          for (var key in src) {
            dst[key] = src[key];
          }
        }
        if (Buffer.from && Buffer.alloc && Buffer.allocUnsafe && Buffer.allocUnsafeSlow) {
          module.exports = buffer;
        } else {
          // Copy properties from require('buffer')
          copyProps(buffer, exports);
          exports.Buffer = SafeBuffer;
        }

        function SafeBuffer(arg, encodingOrOffset, length) {
          return Buffer(arg, encodingOrOffset, length);
        }

        // Copy static methods from Buffer
        copyProps(Buffer, SafeBuffer);

        SafeBuffer.from = function (arg, encodingOrOffset, length) {
          if (typeof arg === "number") {
            throw new TypeError("Argument must not be a number");
          }
          return Buffer(arg, encodingOrOffset, length);
        };

        SafeBuffer.alloc = function (size, fill, encoding) {
          if (typeof size !== "number") {
            throw new TypeError("Argument must be a number");
          }
          var buf = Buffer(size);
          if (fill !== undefined) {
            if (typeof encoding === "string") {
              buf.fill(fill, encoding);
            } else {
              buf.fill(fill);
            }
          } else {
            buf.fill(0);
          }
          return buf;
        };

        SafeBuffer.allocUnsafe = function (size) {
          if (typeof size !== "number") {
            throw new TypeError("Argument must be a number");
          }
          return Buffer(size);
        };

        SafeBuffer.allocUnsafeSlow = function (size) {
          if (typeof size !== "number") {
            throw new TypeError("Argument must be a number");
          }
          return buffer.SlowBuffer(size);
        };
      },
      { buffer: 13 }
    ],

    3: [
      function (require, module, exports) {
        var Buffer = require("safe-buffer").Buffer;

        // prototype class for hash functions
        function Hash(blockSize, finalSize) {
          this._block = Buffer.alloc(blockSize);
          this._finalSize = finalSize;
          this._blockSize = blockSize;
          this._len = 0;
        }

        Hash.prototype.update = function (data, enc) {
          if (typeof data === "string") {
            enc = enc || "utf8";
            data = Buffer.from(data, enc);
          }

          var block = this._block;
          var blockSize = this._blockSize;
          var length = data.length;
          var accum = this._len;

          for (var offset = 0; offset < length; ) {
            var assigned = accum % blockSize;
            var remainder = Math.min(length - offset, blockSize - assigned);

            for (var i = 0; i < remainder; i++) {
              block[assigned + i] = data[offset + i];
            }

            accum += remainder;
            offset += remainder;

            if (accum % blockSize === 0) {
              this._update(block);
            }
          }

          this._len += length;
          return this;
        };

        Hash.prototype.digest = function (enc) {
          var rem = this._len % this._blockSize;

          this._block[rem] = 0x80;

          // zero (rem + 1) trailing bits, where (rem + 1) is the smallest
          // non-negative solution to the equation (length + 1 + (rem + 1)) === finalSize mod blockSize
          this._block.fill(0, rem + 1);

          if (rem >= this._finalSize) {
            this._update(this._block);
            this._block.fill(0);
          }

          var bits = this._len * 8;

          // uint32
          if (bits <= 0xffffffff) {
            this._block.writeUInt32BE(bits, this._blockSize - 4);

            // uint64
          } else {
            var lowBits = (bits & 0xffffffff) >>> 0;
            var highBits = (bits - lowBits) / 0x100000000;

            this._block.writeUInt32BE(highBits, this._blockSize - 8);
            this._block.writeUInt32BE(lowBits, this._blockSize - 4);
          }

          this._update(this._block);
          var hash = this._hash();

          return enc ? hash.toString(enc) : hash;
        };

        Hash.prototype._update = function () {
          throw new Error("_update must be implemented by subclass");
        };

        module.exports = Hash;
      },
      { "safe-buffer": 2 }
    ],

    4: [
      function (require, module, exports) {
        var exports = (module.exports = function SHA(algorithm) {
          algorithm = algorithm.toLowerCase();

          var Algorithm = exports[algorithm];
          if (!Algorithm) {
            throw new Error(algorithm + " is not supported (we accept pull requests)");
          }

          return new Algorithm();
        });

        exports.sha = require("./sha");
        exports.sha1 = require("./sha1");
        exports.sha224 = require("./sha224");
        exports.sha256 = require("./sha256");
        exports.sha384 = require("./sha384");
        exports.sha512 = require("./sha512");
      },
      { "./sha": 5, "./sha1": 6, "./sha224": 7, "./sha256": 8, "./sha384": 9, "./sha512": 10 }
    ],

    5: [
      function (require, module, exports) {
        /*
         * A JavaScript implementation of the Secure Hash Algorithm, SHA-0, as defined
         * in FIPS PUB 180-1
         * This source code is derived from sha1.js of the same repository.
         * The difference between SHA-0 and SHA-1 is just a bitwise rotate left
         * operation was added.
         */

        var inherits = require("inherits");
        var Hash = require("./hash");
        var Buffer = require("safe-buffer").Buffer;

        var K = [0x5a827999, 0x6ed9eba1, 0x8f1bbcdc | 0, 0xca62c1d6 | 0];

        var W = new Array(80);

        function Sha() {
          this.init();
          this._w = W;

          Hash.call(this, 64, 56);
        }

        inherits(Sha, Hash);

        Sha.prototype.init = function () {
          this._a = 0x67452301;
          this._b = 0xefcdab89;
          this._c = 0x98badcfe;
          this._d = 0x10325476;
          this._e = 0xc3d2e1f0;

          return this;
        };

        function rotl5(num) {
          return (num << 5) | (num >>> 27);
        }

        function rotl30(num) {
          return (num << 30) | (num >>> 2);
        }

        function ft(s, b, c, d) {
          if (s === 0) {
            return (b & c) | (~b & d);
          }
          if (s === 2) {
            return (b & c) | (b & d) | (c & d);
          }
          return b ^ c ^ d;
        }

        Sha.prototype._update = function (M) {
          var W = this._w;

          var a = this._a | 0;
          var b = this._b | 0;
          var c = this._c | 0;
          var d = this._d | 0;
          var e = this._e | 0;

          for (var i = 0; i < 16; ++i) {
            W[i] = M.readInt32BE(i * 4);
          }
          for (; i < 80; ++i) {
            W[i] = W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16];
          }

          for (var j = 0; j < 80; ++j) {
            var s = ~~(j / 20);
            var t = (rotl5(a) + ft(s, b, c, d) + e + W[j] + K[s]) | 0;

            e = d;
            d = c;
            c = rotl30(b);
            b = a;
            a = t;
          }

          this._a = (a + this._a) | 0;
          this._b = (b + this._b) | 0;
          this._c = (c + this._c) | 0;
          this._d = (d + this._d) | 0;
          this._e = (e + this._e) | 0;
        };

        Sha.prototype._hash = function () {
          var H = Buffer.allocUnsafe(20);

          H.writeInt32BE(this._a | 0, 0);
          H.writeInt32BE(this._b | 0, 4);
          H.writeInt32BE(this._c | 0, 8);
          H.writeInt32BE(this._d | 0, 12);
          H.writeInt32BE(this._e | 0, 16);

          return H;
        };

        module.exports = Sha;
      },
      { "./hash": 3, inherits: 1, "safe-buffer": 2 }
    ],

    6: [
      function (require, module, exports) {
        /*
         * A JavaScript implementation of the Secure Hash Algorithm, SHA-1, as defined
         * in FIPS PUB 180-1
         * Version 2.1a Copyright Paul Johnston 2000 - 2002.
         * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
         * Distributed under the BSD License
         * See http://pajhome.org.uk/crypt/md5 for details.
         */

        var inherits = require("inherits");
        var Hash = require("./hash");
        var Buffer = require("safe-buffer").Buffer;

        var K = [0x5a827999, 0x6ed9eba1, 0x8f1bbcdc | 0, 0xca62c1d6 | 0];

        var W = new Array(80);

        function Sha1() {
          this.init();
          this._w = W;

          Hash.call(this, 64, 56);
        }

        inherits(Sha1, Hash);

        Sha1.prototype.init = function () {
          this._a = 0x67452301;
          this._b = 0xefcdab89;
          this._c = 0x98badcfe;
          this._d = 0x10325476;
          this._e = 0xc3d2e1f0;

          return this;
        };

        function rotl1(num) {
          return (num << 1) | (num >>> 31);
        }

        function rotl5(num) {
          return (num << 5) | (num >>> 27);
        }

        function rotl30(num) {
          return (num << 30) | (num >>> 2);
        }

        function ft(s, b, c, d) {
          if (s === 0) {
            return (b & c) | (~b & d);
          }
          if (s === 2) {
            return (b & c) | (b & d) | (c & d);
          }
          return b ^ c ^ d;
        }

        Sha1.prototype._update = function (M) {
          var W = this._w;

          var a = this._a | 0;
          var b = this._b | 0;
          var c = this._c | 0;
          var d = this._d | 0;
          var e = this._e | 0;

          for (var i = 0; i < 16; ++i) {
            W[i] = M.readInt32BE(i * 4);
          }
          for (; i < 80; ++i) {
            W[i] = rotl1(W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16]);
          }

          for (var j = 0; j < 80; ++j) {
            var s = ~~(j / 20);
            var t = (rotl5(a) + ft(s, b, c, d) + e + W[j] + K[s]) | 0;

            e = d;
            d = c;
            c = rotl30(b);
            b = a;
            a = t;
          }

          this._a = (a + this._a) | 0;
          this._b = (b + this._b) | 0;
          this._c = (c + this._c) | 0;
          this._d = (d + this._d) | 0;
          this._e = (e + this._e) | 0;
        };

        Sha1.prototype._hash = function () {
          var H = Buffer.allocUnsafe(20);

          H.writeInt32BE(this._a | 0, 0);
          H.writeInt32BE(this._b | 0, 4);
          H.writeInt32BE(this._c | 0, 8);
          H.writeInt32BE(this._d | 0, 12);
          H.writeInt32BE(this._e | 0, 16);

          return H;
        };

        module.exports = Sha1;
      },
      { "./hash": 3, inherits: 1, "safe-buffer": 2 }
    ],

    7: [
      function (require, module, exports) {
        /**
         * A JavaScript implementation of the Secure Hash Algorithm, SHA-256, as defined
         * in FIPS 180-2
         * Version 2.2-beta Copyright Angel Marin, Paul Johnston 2000 - 2009.
         * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
         *
         */

        var inherits = require("inherits");
        var Sha256 = require("./sha256");
        var Hash = require("./hash");
        var Buffer = require("safe-buffer").Buffer;

        var W = new Array(64);

        function Sha224() {
          this.init();

          this._w = W; // new Array(64)

          Hash.call(this, 64, 56);
        }

        inherits(Sha224, Sha256);

        Sha224.prototype.init = function () {
          this._a = 0xc1059ed8;
          this._b = 0x367cd507;
          this._c = 0x3070dd17;
          this._d = 0xf70e5939;
          this._e = 0xffc00b31;
          this._f = 0x68581511;
          this._g = 0x64f98fa7;
          this._h = 0xbefa4fa4;

          return this;
        };

        Sha224.prototype._hash = function () {
          var H = Buffer.allocUnsafe(28);

          H.writeInt32BE(this._a, 0);
          H.writeInt32BE(this._b, 4);
          H.writeInt32BE(this._c, 8);
          H.writeInt32BE(this._d, 12);
          H.writeInt32BE(this._e, 16);
          H.writeInt32BE(this._f, 20);
          H.writeInt32BE(this._g, 24);

          return H;
        };

        module.exports = Sha224;
      },
      { "./hash": 3, "./sha256": 8, inherits: 1, "safe-buffer": 2 }
    ],

    8: [
      function (require, module, exports) {
        /**
         * A JavaScript implementation of the Secure Hash Algorithm, SHA-256, as defined
         * in FIPS 180-2
         * Version 2.2-beta Copyright Angel Marin, Paul Johnston 2000 - 2009.
         * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
         *
         */

        var inherits = require("inherits");
        var Hash = require("./hash");
        var Buffer = require("safe-buffer").Buffer;

        var K = [
          0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7,
          0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
          0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819,
          0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
          0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
        ];

        var W = new Array(64);

        function Sha256() {
          this.init();

          this._w = W; // new Array(64)

          Hash.call(this, 64, 56);
        }

        inherits(Sha256, Hash);

        Sha256.prototype.init = function () {
          this._a = 0x6a09e667;
          this._b = 0xbb67ae85;
          this._c = 0x3c6ef372;
          this._d = 0xa54ff53a;
          this._e = 0x510e527f;
          this._f = 0x9b05688c;
          this._g = 0x1f83d9ab;
          this._h = 0x5be0cd19;

          return this;
        };

        function ch(x, y, z) {
          return z ^ (x & (y ^ z));
        }

        function maj(x, y, z) {
          return (x & y) | (z & (x | y));
        }

        function sigma0(x) {
          return ((x >>> 2) | (x << 30)) ^ ((x >>> 13) | (x << 19)) ^ ((x >>> 22) | (x << 10));
        }

        function sigma1(x) {
          return ((x >>> 6) | (x << 26)) ^ ((x >>> 11) | (x << 21)) ^ ((x >>> 25) | (x << 7));
        }

        function gamma0(x) {
          return ((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3);
        }

        function gamma1(x) {
          return ((x >>> 17) | (x << 15)) ^ ((x >>> 19) | (x << 13)) ^ (x >>> 10);
        }

        Sha256.prototype._update = function (M) {
          var W = this._w;

          var a = this._a | 0;
          var b = this._b | 0;
          var c = this._c | 0;
          var d = this._d | 0;
          var e = this._e | 0;
          var f = this._f | 0;
          var g = this._g | 0;
          var h = this._h | 0;

          for (var i = 0; i < 16; ++i) {
            W[i] = M.readInt32BE(i * 4);
          }
          for (; i < 64; ++i) {
            W[i] = (gamma1(W[i - 2]) + W[i - 7] + gamma0(W[i - 15]) + W[i - 16]) | 0;
          }

          for (var j = 0; j < 64; ++j) {
            var T1 = (h + sigma1(e) + ch(e, f, g) + K[j] + W[j]) | 0;
            var T2 = (sigma0(a) + maj(a, b, c)) | 0;

            h = g;
            g = f;
            f = e;
            e = (d + T1) | 0;
            d = c;
            c = b;
            b = a;
            a = (T1 + T2) | 0;
          }

          this._a = (a + this._a) | 0;
          this._b = (b + this._b) | 0;
          this._c = (c + this._c) | 0;
          this._d = (d + this._d) | 0;
          this._e = (e + this._e) | 0;
          this._f = (f + this._f) | 0;
          this._g = (g + this._g) | 0;
          this._h = (h + this._h) | 0;
        };

        Sha256.prototype._hash = function () {
          var H = Buffer.allocUnsafe(32);

          H.writeInt32BE(this._a, 0);
          H.writeInt32BE(this._b, 4);
          H.writeInt32BE(this._c, 8);
          H.writeInt32BE(this._d, 12);
          H.writeInt32BE(this._e, 16);
          H.writeInt32BE(this._f, 20);
          H.writeInt32BE(this._g, 24);
          H.writeInt32BE(this._h, 28);

          return H;
        };

        module.exports = Sha256;
      },
      { "./hash": 3, inherits: 1, "safe-buffer": 2 }
    ],

    9: [
      function (require, module, exports) {
        var inherits = require("inherits");
        var SHA512 = require("./sha512");
        var Hash = require("./hash");
        var Buffer = require("safe-buffer").Buffer;

        var W = new Array(160);

        function Sha384() {
          this.init();
          this._w = W;

          Hash.call(this, 128, 112);
        }

        inherits(Sha384, SHA512);

        Sha384.prototype.init = function () {
          this._ah = 0xcbbb9d5d;
          this._bh = 0x629a292a;
          this._ch = 0x9159015a;
          this._dh = 0x152fecd8;
          this._eh = 0x67332667;
          this._fh = 0x8eb44a87;
          this._gh = 0xdb0c2e0d;
          this._hh = 0x47b5481d;

          this._al = 0xc1059ed8;
          this._bl = 0x367cd507;
          this._cl = 0x3070dd17;
          this._dl = 0xf70e5939;
          this._el = 0xffc00b31;
          this._fl = 0x68581511;
          this._gl = 0x64f98fa7;
          this._hl = 0xbefa4fa4;

          return this;
        };

        Sha384.prototype._hash = function () {
          var H = Buffer.allocUnsafe(48);

          function writeInt64BE(h, l, offset) {
            H.writeInt32BE(h, offset);
            H.writeInt32BE(l, offset + 4);
          }

          writeInt64BE(this._ah, this._al, 0);
          writeInt64BE(this._bh, this._bl, 8);
          writeInt64BE(this._ch, this._cl, 16);
          writeInt64BE(this._dh, this._dl, 24);
          writeInt64BE(this._eh, this._el, 32);
          writeInt64BE(this._fh, this._fl, 40);

          return H;
        };

        module.exports = Sha384;
      },
      { "./hash": 3, "./sha512": 10, inherits: 1, "safe-buffer": 2 }
    ],

    10: [
      function (require, module, exports) {
        var inherits = require("inherits");
        var Hash = require("./hash");
        var Buffer = require("safe-buffer").Buffer;

        var K = [
          0x428a2f98, 0xd728ae22, 0x71374491, 0x23ef65cd, 0xb5c0fbcf, 0xec4d3b2f, 0xe9b5dba5, 0x8189dbbc, 0x3956c25b, 0xf348b538, 0x59f111f1, 0xb605d019, 0x923f82a4, 0xaf194f9b, 0xab1c5ed5,
          0xda6d8118, 0xd807aa98, 0xa3030242, 0x12835b01, 0x45706fbe, 0x243185be, 0x4ee4b28c, 0x550c7dc3, 0xd5ffb4e2, 0x72be5d74, 0xf27b896f, 0x80deb1fe, 0x3b1696b1, 0x9bdc06a7, 0x25c71235,
          0xc19bf174, 0xcf692694, 0xe49b69c1, 0x9ef14ad2, 0xefbe4786, 0x384f25e3, 0x0fc19dc6, 0x8b8cd5b5, 0x240ca1cc, 0x77ac9c65, 0x2de92c6f, 0x592b0275, 0x4a7484aa, 0x6ea6e483, 0x5cb0a9dc,
          0xbd41fbd4, 0x76f988da, 0x831153b5, 0x983e5152, 0xee66dfab, 0xa831c66d, 0x2db43210, 0xb00327c8, 0x98fb213f, 0xbf597fc7, 0xbeef0ee4, 0xc6e00bf3, 0x3da88fc2, 0xd5a79147, 0x930aa725,
          0x06ca6351, 0xe003826f, 0x14292967, 0x0a0e6e70, 0x27b70a85, 0x46d22ffc, 0x2e1b2138, 0x5c26c926, 0x4d2c6dfc, 0x5ac42aed, 0x53380d13, 0x9d95b3df, 0x650a7354, 0x8baf63de, 0x766a0abb,
          0x3c77b2a8, 0x81c2c92e, 0x47edaee6, 0x92722c85, 0x1482353b, 0xa2bfe8a1, 0x4cf10364, 0xa81a664b, 0xbc423001, 0xc24b8b70, 0xd0f89791, 0xc76c51a3, 0x0654be30, 0xd192e819, 0xd6ef5218,
          0xd6990624, 0x5565a910, 0xf40e3585, 0x5771202a, 0x106aa070, 0x32bbd1b8, 0x19a4c116, 0xb8d2d0c8, 0x1e376c08, 0x5141ab53, 0x2748774c, 0xdf8eeb99, 0x34b0bcb5, 0xe19b48a8, 0x391c0cb3,
          0xc5c95a63, 0x4ed8aa4a, 0xe3418acb, 0x5b9cca4f, 0x7763e373, 0x682e6ff3, 0xd6b2b8a3, 0x748f82ee, 0x5defb2fc, 0x78a5636f, 0x43172f60, 0x84c87814, 0xa1f0ab72, 0x8cc70208, 0x1a6439ec,
          0x90befffa, 0x23631e28, 0xa4506ceb, 0xde82bde9, 0xbef9a3f7, 0xb2c67915, 0xc67178f2, 0xe372532b, 0xca273ece, 0xea26619c, 0xd186b8c7, 0x21c0c207, 0xeada7dd6, 0xcde0eb1e, 0xf57d4f7f,
          0xee6ed178, 0x06f067aa, 0x72176fba, 0x0a637dc5, 0xa2c898a6, 0x113f9804, 0xbef90dae, 0x1b710b35, 0x131c471b, 0x28db77f5, 0x23047d84, 0x32caab7b, 0x40c72493, 0x3c9ebe0a, 0x15c9bebc,
          0x431d67c4, 0x9c100d4c, 0x4cc5d4be, 0xcb3e42b6, 0x597f299c, 0xfc657e2a, 0x5fcb6fab, 0x3ad6faec, 0x6c44198c, 0x4a475817
        ];

        var W = new Array(160);

        function Sha512() {
          this.init();
          this._w = W;

          Hash.call(this, 128, 112);
        }

        inherits(Sha512, Hash);

        Sha512.prototype.init = function () {
          this._ah = 0x6a09e667;
          this._bh = 0xbb67ae85;
          this._ch = 0x3c6ef372;
          this._dh = 0xa54ff53a;
          this._eh = 0x510e527f;
          this._fh = 0x9b05688c;
          this._gh = 0x1f83d9ab;
          this._hh = 0x5be0cd19;

          this._al = 0xf3bcc908;
          this._bl = 0x84caa73b;
          this._cl = 0xfe94f82b;
          this._dl = 0x5f1d36f1;
          this._el = 0xade682d1;
          this._fl = 0x2b3e6c1f;
          this._gl = 0xfb41bd6b;
          this._hl = 0x137e2179;

          return this;
        };

        function Ch(x, y, z) {
          return z ^ (x & (y ^ z));
        }

        function maj(x, y, z) {
          return (x & y) | (z & (x | y));
        }

        function sigma0(x, xl) {
          return ((x >>> 28) | (xl << 4)) ^ ((xl >>> 2) | (x << 30)) ^ ((xl >>> 7) | (x << 25));
        }

        function sigma1(x, xl) {
          return ((x >>> 14) | (xl << 18)) ^ ((x >>> 18) | (xl << 14)) ^ ((xl >>> 9) | (x << 23));
        }

        function Gamma0(x, xl) {
          return ((x >>> 1) | (xl << 31)) ^ ((x >>> 8) | (xl << 24)) ^ (x >>> 7);
        }

        function Gamma0l(x, xl) {
          return ((x >>> 1) | (xl << 31)) ^ ((x >>> 8) | (xl << 24)) ^ ((x >>> 7) | (xl << 25));
        }

        function Gamma1(x, xl) {
          return ((x >>> 19) | (xl << 13)) ^ ((xl >>> 29) | (x << 3)) ^ (x >>> 6);
        }

        function Gamma1l(x, xl) {
          return ((x >>> 19) | (xl << 13)) ^ ((xl >>> 29) | (x << 3)) ^ ((x >>> 6) | (xl << 26));
        }

        function getCarry(a, b) {
          return a >>> 0 < b >>> 0 ? 1 : 0;
        }

        Sha512.prototype._update = function (M) {
          var W = this._w;

          var ah = this._ah | 0;
          var bh = this._bh | 0;
          var ch = this._ch | 0;
          var dh = this._dh | 0;
          var eh = this._eh | 0;
          var fh = this._fh | 0;
          var gh = this._gh | 0;
          var hh = this._hh | 0;

          var al = this._al | 0;
          var bl = this._bl | 0;
          var cl = this._cl | 0;
          var dl = this._dl | 0;
          var el = this._el | 0;
          var fl = this._fl | 0;
          var gl = this._gl | 0;
          var hl = this._hl | 0;

          for (var i = 0; i < 32; i += 2) {
            W[i] = M.readInt32BE(i * 4);
            W[i + 1] = M.readInt32BE(i * 4 + 4);
          }
          for (; i < 160; i += 2) {
            var xh = W[i - 15 * 2];
            var xl = W[i - 15 * 2 + 1];
            var gamma0 = Gamma0(xh, xl);
            var gamma0l = Gamma0l(xl, xh);

            xh = W[i - 2 * 2];
            xl = W[i - 2 * 2 + 1];
            var gamma1 = Gamma1(xh, xl);
            var gamma1l = Gamma1l(xl, xh);

            // W[i] = gamma0 + W[i - 7] + gamma1 + W[i - 16]
            var Wi7h = W[i - 7 * 2];
            var Wi7l = W[i - 7 * 2 + 1];

            var Wi16h = W[i - 16 * 2];
            var Wi16l = W[i - 16 * 2 + 1];

            var Wil = (gamma0l + Wi7l) | 0;
            var Wih = (gamma0 + Wi7h + getCarry(Wil, gamma0l)) | 0;
            Wil = (Wil + gamma1l) | 0;
            Wih = (Wih + gamma1 + getCarry(Wil, gamma1l)) | 0;
            Wil = (Wil + Wi16l) | 0;
            Wih = (Wih + Wi16h + getCarry(Wil, Wi16l)) | 0;

            W[i] = Wih;
            W[i + 1] = Wil;
          }

          for (var j = 0; j < 160; j += 2) {
            Wih = W[j];
            Wil = W[j + 1];

            var majh = maj(ah, bh, ch);
            var majl = maj(al, bl, cl);

            var sigma0h = sigma0(ah, al);
            var sigma0l = sigma0(al, ah);
            var sigma1h = sigma1(eh, el);
            var sigma1l = sigma1(el, eh);

            // t1 = h + sigma1 + ch + K[j] + W[j]
            var Kih = K[j];
            var Kil = K[j + 1];

            var chh = Ch(eh, fh, gh);
            var chl = Ch(el, fl, gl);

            var t1l = (hl + sigma1l) | 0;
            var t1h = (hh + sigma1h + getCarry(t1l, hl)) | 0;
            t1l = (t1l + chl) | 0;
            t1h = (t1h + chh + getCarry(t1l, chl)) | 0;
            t1l = (t1l + Kil) | 0;
            t1h = (t1h + Kih + getCarry(t1l, Kil)) | 0;
            t1l = (t1l + Wil) | 0;
            t1h = (t1h + Wih + getCarry(t1l, Wil)) | 0;

            // t2 = sigma0 + maj
            var t2l = (sigma0l + majl) | 0;
            var t2h = (sigma0h + majh + getCarry(t2l, sigma0l)) | 0;

            hh = gh;
            hl = gl;
            gh = fh;
            gl = fl;
            fh = eh;
            fl = el;
            el = (dl + t1l) | 0;
            eh = (dh + t1h + getCarry(el, dl)) | 0;
            dh = ch;
            dl = cl;
            ch = bh;
            cl = bl;
            bh = ah;
            bl = al;
            al = (t1l + t2l) | 0;
            ah = (t1h + t2h + getCarry(al, t1l)) | 0;
          }

          this._al = (this._al + al) | 0;
          this._bl = (this._bl + bl) | 0;
          this._cl = (this._cl + cl) | 0;
          this._dl = (this._dl + dl) | 0;
          this._el = (this._el + el) | 0;
          this._fl = (this._fl + fl) | 0;
          this._gl = (this._gl + gl) | 0;
          this._hl = (this._hl + hl) | 0;

          this._ah = (this._ah + ah + getCarry(this._al, al)) | 0;
          this._bh = (this._bh + bh + getCarry(this._bl, bl)) | 0;
          this._ch = (this._ch + ch + getCarry(this._cl, cl)) | 0;
          this._dh = (this._dh + dh + getCarry(this._dl, dl)) | 0;
          this._eh = (this._eh + eh + getCarry(this._el, el)) | 0;
          this._fh = (this._fh + fh + getCarry(this._fl, fl)) | 0;
          this._gh = (this._gh + gh + getCarry(this._gl, gl)) | 0;
          this._hh = (this._hh + hh + getCarry(this._hl, hl)) | 0;
        };

        Sha512.prototype._hash = function () {
          var H = Buffer.allocUnsafe(64);

          function writeInt64BE(h, l, offset) {
            H.writeInt32BE(h, offset);
            H.writeInt32BE(l, offset + 4);
          }

          writeInt64BE(this._ah, this._al, 0);
          writeInt64BE(this._bh, this._bl, 8);
          writeInt64BE(this._ch, this._cl, 16);
          writeInt64BE(this._dh, this._dl, 24);
          writeInt64BE(this._eh, this._el, 32);
          writeInt64BE(this._fh, this._fl, 40);
          writeInt64BE(this._gh, this._gl, 48);
          writeInt64BE(this._hh, this._hl, 56);

          return H;
        };

        module.exports = Sha512;
      },
      { "./hash": 3, inherits: 1, "safe-buffer": 2 }
    ],

    11: [
      function (require, module, exports) {
        zx.utils.BrowserifiedBundle.initialise({
          shajs: require("sha.js"),
          safeBuffer: require("safe-buffer"),
          buffer: require("buffer")
        });
      },
      { buffer: 13, "safe-buffer": 2, "sha.js": 4 }
    ],

    12: [
      function (require, module, exports) {
        "use strict";

        exports.byteLength = byteLength;
        exports.toByteArray = toByteArray;
        exports.fromByteArray = fromByteArray;

        var lookup = [];
        var revLookup = [];
        var Arr = typeof Uint8Array !== "undefined" ? Uint8Array : Array;

        var code = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        for (var i = 0, len = code.length; i < len; ++i) {
          lookup[i] = code[i];
          revLookup[code.charCodeAt(i)] = i;
        }

        // Support decoding URL-safe base64 strings, as Node.js does.
        // See: https://en.wikipedia.org/wiki/Base64#URL_applications
        revLookup["-".charCodeAt(0)] = 62;
        revLookup["_".charCodeAt(0)] = 63;

        function getLens(b64) {
          var len = b64.length;

          if (len % 4 > 0) {
            throw new Error("Invalid string. Length must be a multiple of 4");
          }

          // Trim off extra bytes after placeholder bytes are found
          // See: https://github.com/beatgammit/base64-js/issues/42
          var validLen = b64.indexOf("=");
          if (validLen === -1) {
            validLen = len;
          }

          var placeHoldersLen = validLen === len ? 0 : 4 - (validLen % 4);

          return [validLen, placeHoldersLen];
        }

        // base64 is 4/3 + up to two characters of the original data
        function byteLength(b64) {
          var lens = getLens(b64);
          var validLen = lens[0];
          var placeHoldersLen = lens[1];
          return ((validLen + placeHoldersLen) * 3) / 4 - placeHoldersLen;
        }

        function _byteLength(b64, validLen, placeHoldersLen) {
          return ((validLen + placeHoldersLen) * 3) / 4 - placeHoldersLen;
        }

        function toByteArray(b64) {
          var tmp;
          var lens = getLens(b64);
          var validLen = lens[0];
          var placeHoldersLen = lens[1];

          var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen));

          var curByte = 0;

          // if there are placeholders, only get up to the last complete 4 chars
          var len = placeHoldersLen > 0 ? validLen - 4 : validLen;

          var i;
          for (i = 0; i < len; i += 4) {
            tmp = (revLookup[b64.charCodeAt(i)] << 18) | (revLookup[b64.charCodeAt(i + 1)] << 12) | (revLookup[b64.charCodeAt(i + 2)] << 6) | revLookup[b64.charCodeAt(i + 3)];
            arr[curByte++] = (tmp >> 16) & 0xff;
            arr[curByte++] = (tmp >> 8) & 0xff;
            arr[curByte++] = tmp & 0xff;
          }

          if (placeHoldersLen === 2) {
            tmp = (revLookup[b64.charCodeAt(i)] << 2) | (revLookup[b64.charCodeAt(i + 1)] >> 4);
            arr[curByte++] = tmp & 0xff;
          }

          if (placeHoldersLen === 1) {
            tmp = (revLookup[b64.charCodeAt(i)] << 10) | (revLookup[b64.charCodeAt(i + 1)] << 4) | (revLookup[b64.charCodeAt(i + 2)] >> 2);
            arr[curByte++] = (tmp >> 8) & 0xff;
            arr[curByte++] = tmp & 0xff;
          }

          return arr;
        }

        function tripletToBase64(num) {
          return lookup[(num >> 18) & 0x3f] + lookup[(num >> 12) & 0x3f] + lookup[(num >> 6) & 0x3f] + lookup[num & 0x3f];
        }

        function encodeChunk(uint8, start, end) {
          var tmp;
          var output = [];
          for (var i = start; i < end; i += 3) {
            tmp = ((uint8[i] << 16) & 0xff0000) + ((uint8[i + 1] << 8) & 0xff00) + (uint8[i + 2] & 0xff);
            output.push(tripletToBase64(tmp));
          }
          return output.join("");
        }

        function fromByteArray(uint8) {
          var tmp;
          var len = uint8.length;
          var extraBytes = len % 3; // if we have 1 byte left, pad 2 bytes
          var parts = [];
          var maxChunkLength = 16383; // must be multiple of 3

          // go through the array every three bytes, we'll deal with trailing stuff later
          for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
            parts.push(encodeChunk(uint8, i, i + maxChunkLength > len2 ? len2 : i + maxChunkLength));
          }

          // pad the end with zeros, but make sure to not forget the extra bytes
          if (extraBytes === 1) {
            tmp = uint8[len - 1];
            parts.push(lookup[tmp >> 2] + lookup[(tmp << 4) & 0x3f] + "==");
          } else if (extraBytes === 2) {
            tmp = (uint8[len - 2] << 8) + uint8[len - 1];
            parts.push(lookup[tmp >> 10] + lookup[(tmp >> 4) & 0x3f] + lookup[(tmp << 2) & 0x3f] + "=");
          }

          return parts.join("");
        }
      },
      {}
    ],

    13: [
      function (require, module, exports) {
        (function (Buffer) {
          (function () {
            /*!
             * The buffer module from node.js, for the browser.
             *
             * @author   Feross Aboukhadijeh <https://feross.org>
             * @license  MIT
             */
            /* eslint-disable no-proto */

            "use strict";

            var base64 = require("base64-js");
            var ieee754 = require("ieee754");

            exports.Buffer = Buffer;
            exports.SlowBuffer = SlowBuffer;
            exports.INSPECT_MAX_BYTES = 50;

            var K_MAX_LENGTH = 0x7fffffff;
            exports.kMaxLength = K_MAX_LENGTH;

            /**
             * If `Buffer.TYPED_ARRAY_SUPPORT`:
             *   === true    Use Uint8Array implementation (fastest)
             *   === false   Print warning and recommend using `buffer` v4.x which has an Object
             *               implementation (most compatible, even IE6)
             *
             * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
             * Opera 11.6+, iOS 4.2+.
             *
             * We report that the browser does not support typed arrays if the are not subclassable
             * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
             * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
             * for __proto__ and has a buggy typed array implementation.
             */
            Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport();

            if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== "undefined" && typeof console.error === "function") {
              console.error("This browser lacks typed array (Uint8Array) support which is required by " + "`buffer` v5.x. Use `buffer` v4.x if you require old browser support.");
            }

            function typedArraySupport() {
              // Can typed array instances can be augmented?
              try {
                var arr = new Uint8Array(1);
                arr.__proto__ = {
                  __proto__: Uint8Array.prototype,
                  foo() {
                    return 42;
                  }
                };

                return arr.foo() === 42;
              } catch (e) {
                return false;
              }
            }

            Object.defineProperty(Buffer.prototype, "parent", {
              enumerable: true,
              get() {
                if (!Buffer.isBuffer(this)) {
                  return undefined;
                }
                return this.buffer;
              }
            });

            Object.defineProperty(Buffer.prototype, "offset", {
              enumerable: true,
              get() {
                if (!Buffer.isBuffer(this)) {
                  return undefined;
                }
                return this.byteOffset;
              }
            });

            function createBuffer(length) {
              if (length > K_MAX_LENGTH) {
                throw new RangeError('The value "' + length + '" is invalid for option "size"');
              }
              // Return an augmented `Uint8Array` instance
              var buf = new Uint8Array(length);
              buf.__proto__ = Buffer.prototype;
              return buf;
            }

            /**
             * The Buffer constructor returns instances of `Uint8Array` that have their
             * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
             * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
             * and the `Uint8Array` methods. Square bracket notation works as expected -- it
             * returns a single octet.
             *
             * The `Uint8Array` prototype remains unmodified.
             */

            function Buffer(arg, encodingOrOffset, length) {
              // Common case.
              if (typeof arg === "number") {
                if (typeof encodingOrOffset === "string") {
                  throw new TypeError('The "string" argument must be of type string. Received type number');
                }
                return allocUnsafe(arg);
              }
              return from(arg, encodingOrOffset, length);
            }

            // Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
            if (typeof Symbol !== "undefined" && Symbol.species != null && Buffer[Symbol.species] === Buffer) {
              Object.defineProperty(Buffer, Symbol.species, {
                value: null,
                configurable: true,
                enumerable: false,
                writable: false
              });
            }

            Buffer.poolSize = 8192; // not used by this implementation

            function from(value, encodingOrOffset, length) {
              if (typeof value === "string") {
                return fromString(value, encodingOrOffset);
              }

              if (ArrayBuffer.isView(value)) {
                return fromArrayLike(value);
              }

              if (value == null) {
                throw TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, " + "or Array-like Object. Received type " + typeof value);
              }

              if (isInstance(value, ArrayBuffer) || (value && isInstance(value.buffer, ArrayBuffer))) {
                return fromArrayBuffer(value, encodingOrOffset, length);
              }

              if (typeof value === "number") {
                throw new TypeError('The "value" argument must not be of type number. Received type number');
              }

              var valueOf = value.valueOf && value.valueOf();
              if (valueOf != null && valueOf !== value) {
                return Buffer.from(valueOf, encodingOrOffset, length);
              }

              var b = fromObject(value);
              if (b) {
                return b;
              }

              if (typeof Symbol !== "undefined" && Symbol.toPrimitive != null && typeof value[Symbol.toPrimitive] === "function") {
                return Buffer.from(value[Symbol.toPrimitive]("string"), encodingOrOffset, length);
              }

              throw new TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, " + "or Array-like Object. Received type " + typeof value);
            }

            /**
             * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
             * if value is a number.
             * Buffer.from(str[, encoding])
             * Buffer.from(array)
             * Buffer.from(buffer)
             * Buffer.from(arrayBuffer[, byteOffset[, length]])
             **/
            Buffer.from = function (value, encodingOrOffset, length) {
              return from(value, encodingOrOffset, length);
            };

            // Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
            // https://github.com/feross/buffer/pull/148
            Buffer.prototype.__proto__ = Uint8Array.prototype;
            Buffer.__proto__ = Uint8Array;

            function assertSize(size) {
              if (typeof size !== "number") {
                throw new TypeError('"size" argument must be of type number');
              } else if (size < 0) {
                throw new RangeError('The value "' + size + '" is invalid for option "size"');
              }
            }

            function alloc(size, fill, encoding) {
              assertSize(size);
              if (size <= 0) {
                return createBuffer(size);
              }
              if (fill !== undefined) {
                // Only pay attention to encoding if it's a string. This
                // prevents accidentally sending in a number that would
                // be interpretted as a start offset.
                return typeof encoding === "string" ? createBuffer(size).fill(fill, encoding) : createBuffer(size).fill(fill);
              }
              return createBuffer(size);
            }

            /**
             * Creates a new filled Buffer instance.
             * alloc(size[, fill[, encoding]])
             **/
            Buffer.alloc = function (size, fill, encoding) {
              return alloc(size, fill, encoding);
            };

            function allocUnsafe(size) {
              assertSize(size);
              return createBuffer(size < 0 ? 0 : checked(size) | 0);
            }

            /**
             * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
             * */
            Buffer.allocUnsafe = function (size) {
              return allocUnsafe(size);
            };
            /**
             * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
             */
            Buffer.allocUnsafeSlow = function (size) {
              return allocUnsafe(size);
            };

            function fromString(string, encoding) {
              if (typeof encoding !== "string" || encoding === "") {
                encoding = "utf8";
              }

              if (!Buffer.isEncoding(encoding)) {
                throw new TypeError("Unknown encoding: " + encoding);
              }

              var length = byteLength(string, encoding) | 0;
              var buf = createBuffer(length);

              var actual = buf.write(string, encoding);

              if (actual !== length) {
                // Writing a hex string, for example, that contains invalid characters will
                // cause everything after the first invalid character to be ignored. (e.g.
                // 'abxxcd' will be treated as 'ab')
                buf = buf.slice(0, actual);
              }

              return buf;
            }

            function fromArrayLike(array) {
              var length = array.length < 0 ? 0 : checked(array.length) | 0;
              var buf = createBuffer(length);
              for (var i = 0; i < length; i += 1) {
                buf[i] = array[i] & 255;
              }
              return buf;
            }

            function fromArrayBuffer(array, byteOffset, length) {
              if (byteOffset < 0 || array.byteLength < byteOffset) {
                throw new RangeError('"offset" is outside of buffer bounds');
              }

              if (array.byteLength < byteOffset + (length || 0)) {
                throw new RangeError('"length" is outside of buffer bounds');
              }

              var buf;
              if (byteOffset === undefined && length === undefined) {
                buf = new Uint8Array(array);
              } else if (length === undefined) {
                buf = new Uint8Array(array, byteOffset);
              } else {
                buf = new Uint8Array(array, byteOffset, length);
              }

              // Return an augmented `Uint8Array` instance
              buf.__proto__ = Buffer.prototype;
              return buf;
            }

            function fromObject(obj) {
              if (Buffer.isBuffer(obj)) {
                var len = checked(obj.length) | 0;
                var buf = createBuffer(len);

                if (buf.length === 0) {
                  return buf;
                }

                obj.copy(buf, 0, 0, len);
                return buf;
              }

              if (obj.length !== undefined) {
                if (typeof obj.length !== "number" || numberIsNaN(obj.length)) {
                  return createBuffer(0);
                }
                return fromArrayLike(obj);
              }

              if (obj.type === "Buffer" && Array.isArray(obj.data)) {
                return fromArrayLike(obj.data);
              }
            }

            function checked(length) {
              // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
              // length is NaN (which is otherwise coerced to zero.)
              if (length >= K_MAX_LENGTH) {
                throw new RangeError("Attempt to allocate Buffer larger than maximum " + "size: 0x" + K_MAX_LENGTH.toString(16) + " bytes");
              }
              return length | 0;
            }

            function SlowBuffer(length) {
              if (+length != length) {
                // eslint-disable-line eqeqeq
                length = 0;
              }
              return Buffer.alloc(+length);
            }

            Buffer.isBuffer = function isBuffer(b) {
              return b != null && b._isBuffer === true && b !== Buffer.prototype; // so Buffer.isBuffer(Buffer.prototype) will be false
            };

            Buffer.compare = function compare(a, b) {
              if (isInstance(a, Uint8Array)) {
                a = Buffer.from(a, a.offset, a.byteLength);
              }
              if (isInstance(b, Uint8Array)) {
                b = Buffer.from(b, b.offset, b.byteLength);
              }
              if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
                throw new TypeError('The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array');
              }

              if (a === b) {
                return 0;
              }

              var x = a.length;
              var y = b.length;

              for (var i = 0, len = Math.min(x, y); i < len; ++i) {
                if (a[i] !== b[i]) {
                  x = a[i];
                  y = b[i];
                  break;
                }
              }

              if (x < y) {
                return -1;
              }
              if (y < x) {
                return 1;
              }
              return 0;
            };

            Buffer.isEncoding = function isEncoding(encoding) {
              switch (String(encoding).toLowerCase()) {
                case "hex":
                case "utf8":
                case "utf-8":
                case "ascii":
                case "latin1":
                case "binary":
                case "base64":
                case "ucs2":
                case "ucs-2":
                case "utf16le":
                case "utf-16le":
                  return true;
                default:
                  return false;
              }
            };

            Buffer.concat = function concat(list, length) {
              if (!Array.isArray(list)) {
                throw new TypeError('"list" argument must be an Array of Buffers');
              }

              if (list.length === 0) {
                return Buffer.alloc(0);
              }

              var i;
              if (length === undefined) {
                length = 0;
                for (i = 0; i < list.length; ++i) {
                  length += list[i].length;
                }
              }

              var buffer = Buffer.allocUnsafe(length);
              var pos = 0;
              for (i = 0; i < list.length; ++i) {
                var buf = list[i];
                if (isInstance(buf, Uint8Array)) {
                  buf = Buffer.from(buf);
                }
                if (!Buffer.isBuffer(buf)) {
                  throw new TypeError('"list" argument must be an Array of Buffers');
                }
                buf.copy(buffer, pos);
                pos += buf.length;
              }
              return buffer;
            };

            function byteLength(string, encoding) {
              if (Buffer.isBuffer(string)) {
                return string.length;
              }
              if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
                return string.byteLength;
              }
              if (typeof string !== "string") {
                throw new TypeError('The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' + "Received type " + typeof string);
              }

              var len = string.length;
              var mustMatch = arguments.length > 2 && arguments[2] === true;
              if (!mustMatch && len === 0) {
                return 0;
              }

              // Use a for loop to avoid recursion
              var loweredCase = false;
              for (;;) {
                switch (encoding) {
                  case "ascii":
                  case "latin1":
                  case "binary":
                    return len;
                  case "utf8":
                  case "utf-8":
                    return utf8ToBytes(string).length;
                  case "ucs2":
                  case "ucs-2":
                  case "utf16le":
                  case "utf-16le":
                    return len * 2;
                  case "hex":
                    return len >>> 1;
                  case "base64":
                    return base64ToBytes(string).length;
                  default:
                    if (loweredCase) {
                      return mustMatch ? -1 : utf8ToBytes(string).length; // assume utf8
                    }
                    encoding = ("" + encoding).toLowerCase();
                    loweredCase = true;
                }
              }
            }
            Buffer.byteLength = byteLength;

            function slowToString(encoding, start, end) {
              var loweredCase = false;

              // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
              // property of a typed array.

              // This behaves neither like String nor Uint8Array in that we set start/end
              // to their upper/lower bounds if the value passed is out of range.
              // undefined is handled specially as per ECMA-262 6th Edition,
              // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
              if (start === undefined || start < 0) {
                start = 0;
              }
              // Return early if start > this.length. Done here to prevent potential uint32
              // coercion fail below.
              if (start > this.length) {
                return "";
              }

              if (end === undefined || end > this.length) {
                end = this.length;
              }

              if (end <= 0) {
                return "";
              }

              // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
              end >>>= 0;
              start >>>= 0;

              if (end <= start) {
                return "";
              }

              if (!encoding) {
                encoding = "utf8";
              }

              while (true) {
                switch (encoding) {
                  case "hex":
                    return hexSlice(this, start, end);

                  case "utf8":
                  case "utf-8":
                    return utf8Slice(this, start, end);

                  case "ascii":
                    return asciiSlice(this, start, end);

                  case "latin1":
                  case "binary":
                    return latin1Slice(this, start, end);

                  case "base64":
                    return base64Slice(this, start, end);

                  case "ucs2":
                  case "ucs-2":
                  case "utf16le":
                  case "utf-16le":
                    return utf16leSlice(this, start, end);

                  default:
                    if (loweredCase) {
                      throw new TypeError("Unknown encoding: " + encoding);
                    }
                    encoding = (encoding + "").toLowerCase();
                    loweredCase = true;
                }
              }
            }

            // This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
            // to detect a Buffer instance. It's not possible to use `instanceof Buffer`
            // reliably in a browserify context because there could be multiple different
            // copies of the 'buffer' package in use. This method works even for Buffer
            // instances that were created from another copy of the `buffer` package.
            // See: https://github.com/feross/buffer/issues/154
            Buffer.prototype._isBuffer = true;

            function swap(b, n, m) {
              var i = b[n];
              b[n] = b[m];
              b[m] = i;
            }

            Buffer.prototype.swap16 = function swap16() {
              var len = this.length;
              if (len % 2 !== 0) {
                throw new RangeError("Buffer size must be a multiple of 16-bits");
              }
              for (var i = 0; i < len; i += 2) {
                swap(this, i, i + 1);
              }
              return this;
            };

            Buffer.prototype.swap32 = function swap32() {
              var len = this.length;
              if (len % 4 !== 0) {
                throw new RangeError("Buffer size must be a multiple of 32-bits");
              }
              for (var i = 0; i < len; i += 4) {
                swap(this, i, i + 3);
                swap(this, i + 1, i + 2);
              }
              return this;
            };

            Buffer.prototype.swap64 = function swap64() {
              var len = this.length;
              if (len % 8 !== 0) {
                throw new RangeError("Buffer size must be a multiple of 64-bits");
              }
              for (var i = 0; i < len; i += 8) {
                swap(this, i, i + 7);
                swap(this, i + 1, i + 6);
                swap(this, i + 2, i + 5);
                swap(this, i + 3, i + 4);
              }
              return this;
            };

            Buffer.prototype.toString = function toString() {
              var length = this.length;
              if (length === 0) {
                return "";
              }
              if (arguments.length === 0) {
                return utf8Slice(this, 0, length);
              }
              return slowToString.apply(this, arguments);
            };

            Buffer.prototype.toLocaleString = Buffer.prototype.toString;

            Buffer.prototype.equals = function equals(b) {
              if (!Buffer.isBuffer(b)) {
                throw new TypeError("Argument must be a Buffer");
              }
              if (this === b) {
                return true;
              }
              return Buffer.compare(this, b) === 0;
            };

            Buffer.prototype.inspect = function inspect() {
              var str = "";
              var max = exports.INSPECT_MAX_BYTES;
              str = this.toString("hex", 0, max)
                .replace(/(.{2})/g, "$1 ")
                .trim();
              if (this.length > max) {
                str += " ... ";
              }
              return "<Buffer " + str + ">";
            };

            Buffer.prototype.compare = function compare(target, start, end, thisStart, thisEnd) {
              if (isInstance(target, Uint8Array)) {
                target = Buffer.from(target, target.offset, target.byteLength);
              }
              if (!Buffer.isBuffer(target)) {
                throw new TypeError('The "target" argument must be one of type Buffer or Uint8Array. ' + "Received type " + typeof target);
              }

              if (start === undefined) {
                start = 0;
              }
              if (end === undefined) {
                end = target ? target.length : 0;
              }
              if (thisStart === undefined) {
                thisStart = 0;
              }
              if (thisEnd === undefined) {
                thisEnd = this.length;
              }

              if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
                throw new RangeError("out of range index");
              }

              if (thisStart >= thisEnd && start >= end) {
                return 0;
              }
              if (thisStart >= thisEnd) {
                return -1;
              }
              if (start >= end) {
                return 1;
              }

              start >>>= 0;
              end >>>= 0;
              thisStart >>>= 0;
              thisEnd >>>= 0;

              if (this === target) {
                return 0;
              }

              var x = thisEnd - thisStart;
              var y = end - start;
              var len = Math.min(x, y);

              var thisCopy = this.slice(thisStart, thisEnd);
              var targetCopy = target.slice(start, end);

              for (var i = 0; i < len; ++i) {
                if (thisCopy[i] !== targetCopy[i]) {
                  x = thisCopy[i];
                  y = targetCopy[i];
                  break;
                }
              }

              if (x < y) {
                return -1;
              }
              if (y < x) {
                return 1;
              }
              return 0;
            };

            // Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
            // OR the last index of `val` in `buffer` at offset <= `byteOffset`.
            //
            // Arguments:
            // - buffer - a Buffer to search
            // - val - a string, Buffer, or number
            // - byteOffset - an index into `buffer`; will be clamped to an int32
            // - encoding - an optional encoding, relevant is val is a string
            // - dir - true for indexOf, false for lastIndexOf
            function bidirectionalIndexOf(buffer, val, byteOffset, encoding, dir) {
              // Empty buffer means no match
              if (buffer.length === 0) {
                return -1;
              }

              // Normalize byteOffset
              if (typeof byteOffset === "string") {
                encoding = byteOffset;
                byteOffset = 0;
              } else if (byteOffset > 0x7fffffff) {
                byteOffset = 0x7fffffff;
              } else if (byteOffset < -0x80000000) {
                byteOffset = -0x80000000;
              }
              byteOffset = +byteOffset; // Coerce to Number.
              if (numberIsNaN(byteOffset)) {
                // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
                byteOffset = dir ? 0 : buffer.length - 1;
              }

              // Normalize byteOffset: negative offsets start from the end of the buffer
              if (byteOffset < 0) {
                byteOffset = buffer.length + byteOffset;
              }
              if (byteOffset >= buffer.length) {
                if (dir) {
                  return -1;
                } else byteOffset = buffer.length - 1;
              } else if (byteOffset < 0) {
                if (dir) {
                  byteOffset = 0;
                } else return -1;
              }

              // Normalize val
              if (typeof val === "string") {
                val = Buffer.from(val, encoding);
              }

              // Finally, search either indexOf (if dir is true) or lastIndexOf
              if (Buffer.isBuffer(val)) {
                // Special case: looking for empty string/buffer always fails
                if (val.length === 0) {
                  return -1;
                }
                return arrayIndexOf(buffer, val, byteOffset, encoding, dir);
              } else if (typeof val === "number") {
                val = val & 0xff; // Search for a byte value [0-255]
                if (typeof Uint8Array.prototype.indexOf === "function") {
                  if (dir) {
                    return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset);
                  } else {
                    return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset);
                  }
                }
                return arrayIndexOf(buffer, [val], byteOffset, encoding, dir);
              }

              throw new TypeError("val must be string, number or Buffer");
            }

            function arrayIndexOf(arr, val, byteOffset, encoding, dir) {
              var indexSize = 1;
              var arrLength = arr.length;
              var valLength = val.length;

              if (encoding !== undefined) {
                encoding = String(encoding).toLowerCase();
                if (encoding === "ucs2" || encoding === "ucs-2" || encoding === "utf16le" || encoding === "utf-16le") {
                  if (arr.length < 2 || val.length < 2) {
                    return -1;
                  }
                  indexSize = 2;
                  arrLength /= 2;
                  valLength /= 2;
                  byteOffset /= 2;
                }
              }

              function read(buf, i) {
                if (indexSize === 1) {
                  return buf[i];
                } else {
                  return buf.readUInt16BE(i * indexSize);
                }
              }

              var i;
              if (dir) {
                var foundIndex = -1;
                for (i = byteOffset; i < arrLength; i++) {
                  if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
                    if (foundIndex === -1) {
                      foundIndex = i;
                    }
                    if (i - foundIndex + 1 === valLength) {
                      return foundIndex * indexSize;
                    }
                  } else {
                    if (foundIndex !== -1) {
                      i -= i - foundIndex;
                    }
                    foundIndex = -1;
                  }
                }
              } else {
                if (byteOffset + valLength > arrLength) {
                  byteOffset = arrLength - valLength;
                }
                for (i = byteOffset; i >= 0; i--) {
                  var found = true;
                  for (var j = 0; j < valLength; j++) {
                    if (read(arr, i + j) !== read(val, j)) {
                      found = false;
                      break;
                    }
                  }
                  if (found) {
                    return i;
                  }
                }
              }

              return -1;
            }

            Buffer.prototype.includes = function includes(val, byteOffset, encoding) {
              return this.indexOf(val, byteOffset, encoding) !== -1;
            };

            Buffer.prototype.indexOf = function indexOf(val, byteOffset, encoding) {
              return bidirectionalIndexOf(this, val, byteOffset, encoding, true);
            };

            Buffer.prototype.lastIndexOf = function lastIndexOf(val, byteOffset, encoding) {
              return bidirectionalIndexOf(this, val, byteOffset, encoding, false);
            };

            function hexWrite(buf, string, offset, length) {
              offset = Number(offset) || 0;
              var remaining = buf.length - offset;
              if (!length) {
                length = remaining;
              } else {
                length = Number(length);
                if (length > remaining) {
                  length = remaining;
                }
              }

              var strLen = string.length;

              if (length > strLen / 2) {
                length = strLen / 2;
              }
              for (var i = 0; i < length; ++i) {
                var parsed = parseInt(string.substr(i * 2, 2), 16);
                if (numberIsNaN(parsed)) {
                  return i;
                }
                buf[offset + i] = parsed;
              }
              return i;
            }

            function utf8Write(buf, string, offset, length) {
              return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length);
            }

            function asciiWrite(buf, string, offset, length) {
              return blitBuffer(asciiToBytes(string), buf, offset, length);
            }

            function latin1Write(buf, string, offset, length) {
              return asciiWrite(buf, string, offset, length);
            }

            function base64Write(buf, string, offset, length) {
              return blitBuffer(base64ToBytes(string), buf, offset, length);
            }

            function ucs2Write(buf, string, offset, length) {
              return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length);
            }

            Buffer.prototype.write = function write(string, offset, length, encoding) {
              // Buffer#write(string)
              if (offset === undefined) {
                encoding = "utf8";
                length = this.length;
                offset = 0;
                // Buffer#write(string, encoding)
              } else if (length === undefined && typeof offset === "string") {
                encoding = offset;
                length = this.length;
                offset = 0;
                // Buffer#write(string, offset[, length][, encoding])
              } else if (isFinite(offset)) {
                offset = offset >>> 0;
                if (isFinite(length)) {
                  length = length >>> 0;
                  if (encoding === undefined) {
                    encoding = "utf8";
                  }
                } else {
                  encoding = length;
                  length = undefined;
                }
              } else {
                throw new Error("Buffer.write(string, encoding, offset[, length]) is no longer supported");
              }

              var remaining = this.length - offset;
              if (length === undefined || length > remaining) {
                length = remaining;
              }

              if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
                throw new RangeError("Attempt to write outside buffer bounds");
              }

              if (!encoding) {
                encoding = "utf8";
              }

              var loweredCase = false;
              for (;;) {
                switch (encoding) {
                  case "hex":
                    return hexWrite(this, string, offset, length);

                  case "utf8":
                  case "utf-8":
                    return utf8Write(this, string, offset, length);

                  case "ascii":
                    return asciiWrite(this, string, offset, length);

                  case "latin1":
                  case "binary":
                    return latin1Write(this, string, offset, length);

                  case "base64":
                    // Warning: maxLength not taken into account in base64Write
                    return base64Write(this, string, offset, length);

                  case "ucs2":
                  case "ucs-2":
                  case "utf16le":
                  case "utf-16le":
                    return ucs2Write(this, string, offset, length);

                  default:
                    if (loweredCase) {
                      throw new TypeError("Unknown encoding: " + encoding);
                    }
                    encoding = ("" + encoding).toLowerCase();
                    loweredCase = true;
                }
              }
            };

            Buffer.prototype.toJSON = function toJSON() {
              return {
                type: "Buffer",
                data: Array.prototype.slice.call(this._arr || this, 0)
              };
            };

            function base64Slice(buf, start, end) {
              if (start === 0 && end === buf.length) {
                return base64.fromByteArray(buf);
              } else {
                return base64.fromByteArray(buf.slice(start, end));
              }
            }

            function utf8Slice(buf, start, end) {
              end = Math.min(buf.length, end);
              var res = [];

              var i = start;
              while (i < end) {
                var firstByte = buf[i];
                var codePoint = null;
                var bytesPerSequence = firstByte > 0xef ? 4 : firstByte > 0xdf ? 3 : firstByte > 0xbf ? 2 : 1;

                if (i + bytesPerSequence <= end) {
                  var secondByte, thirdByte, fourthByte, tempCodePoint;

                  switch (bytesPerSequence) {
                    case 1:
                      if (firstByte < 0x80) {
                        codePoint = firstByte;
                      }
                      break;
                    case 2:
                      secondByte = buf[i + 1];
                      if ((secondByte & 0xc0) === 0x80) {
                        tempCodePoint = ((firstByte & 0x1f) << 0x6) | (secondByte & 0x3f);
                        if (tempCodePoint > 0x7f) {
                          codePoint = tempCodePoint;
                        }
                      }
                      break;
                    case 3:
                      secondByte = buf[i + 1];
                      thirdByte = buf[i + 2];
                      if ((secondByte & 0xc0) === 0x80 && (thirdByte & 0xc0) === 0x80) {
                        tempCodePoint = ((firstByte & 0xf) << 0xc) | ((secondByte & 0x3f) << 0x6) | (thirdByte & 0x3f);
                        if (tempCodePoint > 0x7ff && (tempCodePoint < 0xd800 || tempCodePoint > 0xdfff)) {
                          codePoint = tempCodePoint;
                        }
                      }
                      break;
                    case 4:
                      secondByte = buf[i + 1];
                      thirdByte = buf[i + 2];
                      fourthByte = buf[i + 3];
                      if ((secondByte & 0xc0) === 0x80 && (thirdByte & 0xc0) === 0x80 && (fourthByte & 0xc0) === 0x80) {
                        tempCodePoint = ((firstByte & 0xf) << 0x12) | ((secondByte & 0x3f) << 0xc) | ((thirdByte & 0x3f) << 0x6) | (fourthByte & 0x3f);
                        if (tempCodePoint > 0xffff && tempCodePoint < 0x110000) {
                          codePoint = tempCodePoint;
                        }
                      }
                  }
                }

                if (codePoint === null) {
                  // we did not generate a valid codePoint so insert a
                  // replacement char (U+FFFD) and advance only 1 byte
                  codePoint = 0xfffd;
                  bytesPerSequence = 1;
                } else if (codePoint > 0xffff) {
                  // encode to utf16 (surrogate pair dance)
                  codePoint -= 0x10000;
                  res.push(((codePoint >>> 10) & 0x3ff) | 0xd800);
                  codePoint = 0xdc00 | (codePoint & 0x3ff);
                }

                res.push(codePoint);
                i += bytesPerSequence;
              }

              return decodeCodePointsArray(res);
            }

            // Based on http://stackoverflow.com/a/22747272/680742, the browser with
            // the lowest limit is Chrome, with 0x10000 args.
            // We go 1 magnitude less, for safety
            var MAX_ARGUMENTS_LENGTH = 0x1000;

            function decodeCodePointsArray(codePoints) {
              var len = codePoints.length;
              if (len <= MAX_ARGUMENTS_LENGTH) {
                return String.fromCharCode.apply(String, codePoints); // avoid extra slice()
              }

              // Decode in chunks to avoid "call stack size exceeded".
              var res = "";
              var i = 0;
              while (i < len) {
                res += String.fromCharCode.apply(String, codePoints.slice(i, (i += MAX_ARGUMENTS_LENGTH)));
              }
              return res;
            }

            function asciiSlice(buf, start, end) {
              var ret = "";
              end = Math.min(buf.length, end);

              for (var i = start; i < end; ++i) {
                ret += String.fromCharCode(buf[i] & 0x7f);
              }
              return ret;
            }

            function latin1Slice(buf, start, end) {
              var ret = "";
              end = Math.min(buf.length, end);

              for (var i = start; i < end; ++i) {
                ret += String.fromCharCode(buf[i]);
              }
              return ret;
            }

            function hexSlice(buf, start, end) {
              var len = buf.length;

              if (!start || start < 0) {
                start = 0;
              }
              if (!end || end < 0 || end > len) {
                end = len;
              }

              var out = "";
              for (var i = start; i < end; ++i) {
                out += toHex(buf[i]);
              }
              return out;
            }

            function utf16leSlice(buf, start, end) {
              var bytes = buf.slice(start, end);
              var res = "";
              for (var i = 0; i < bytes.length; i += 2) {
                res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256);
              }
              return res;
            }

            Buffer.prototype.slice = function slice(start, end) {
              var len = this.length;
              start = ~~start;
              end = end === undefined ? len : ~~end;

              if (start < 0) {
                start += len;
                if (start < 0) {
                  start = 0;
                }
              } else if (start > len) {
                start = len;
              }

              if (end < 0) {
                end += len;
                if (end < 0) {
                  end = 0;
                }
              } else if (end > len) {
                end = len;
              }

              if (end < start) {
                end = start;
              }

              var newBuf = this.subarray(start, end);
              // Return an augmented `Uint8Array` instance
              newBuf.__proto__ = Buffer.prototype;
              return newBuf;
            };

            /*
             * Need to make sure that buffer isn't trying to write out of bounds.
             */
            function checkOffset(offset, ext, length) {
              if (offset % 1 !== 0 || offset < 0) {
                throw new RangeError("offset is not uint");
              }
              if (offset + ext > length) {
                throw new RangeError("Trying to access beyond buffer length");
              }
            }

            Buffer.prototype.readUIntLE = function readUIntLE(offset, byteLength, noAssert) {
              offset = offset >>> 0;
              byteLength = byteLength >>> 0;
              if (!noAssert) {
                checkOffset(offset, byteLength, this.length);
              }

              var val = this[offset];
              var mul = 1;
              var i = 0;
              while (++i < byteLength && (mul *= 0x100)) {
                val += this[offset + i] * mul;
              }

              return val;
            };

            Buffer.prototype.readUIntBE = function readUIntBE(offset, byteLength, noAssert) {
              offset = offset >>> 0;
              byteLength = byteLength >>> 0;
              if (!noAssert) {
                checkOffset(offset, byteLength, this.length);
              }

              var val = this[offset + --byteLength];
              var mul = 1;
              while (byteLength > 0 && (mul *= 0x100)) {
                val += this[offset + --byteLength] * mul;
              }

              return val;
            };

            Buffer.prototype.readUInt8 = function readUInt8(offset, noAssert) {
              offset = offset >>> 0;
              if (!noAssert) {
                checkOffset(offset, 1, this.length);
              }
              return this[offset];
            };

            Buffer.prototype.readUInt16LE = function readUInt16LE(offset, noAssert) {
              offset = offset >>> 0;
              if (!noAssert) {
                checkOffset(offset, 2, this.length);
              }
              return this[offset] | (this[offset + 1] << 8);
            };

            Buffer.prototype.readUInt16BE = function readUInt16BE(offset, noAssert) {
              offset = offset >>> 0;
              if (!noAssert) {
                checkOffset(offset, 2, this.length);
              }
              return (this[offset] << 8) | this[offset + 1];
            };

            Buffer.prototype.readUInt32LE = function readUInt32LE(offset, noAssert) {
              offset = offset >>> 0;
              if (!noAssert) {
                checkOffset(offset, 4, this.length);
              }

              return (this[offset] | (this[offset + 1] << 8) | (this[offset + 2] << 16)) + this[offset + 3] * 0x1000000;
            };

            Buffer.prototype.readUInt32BE = function readUInt32BE(offset, noAssert) {
              offset = offset >>> 0;
              if (!noAssert) {
                checkOffset(offset, 4, this.length);
              }

              return this[offset] * 0x1000000 + ((this[offset + 1] << 16) | (this[offset + 2] << 8) | this[offset + 3]);
            };

            Buffer.prototype.readIntLE = function readIntLE(offset, byteLength, noAssert) {
              offset = offset >>> 0;
              byteLength = byteLength >>> 0;
              if (!noAssert) {
                checkOffset(offset, byteLength, this.length);
              }

              var val = this[offset];
              var mul = 1;
              var i = 0;
              while (++i < byteLength && (mul *= 0x100)) {
                val += this[offset + i] * mul;
              }
              mul *= 0x80;

              if (val >= mul) {
                val -= Math.pow(2, 8 * byteLength);
              }

              return val;
            };

            Buffer.prototype.readIntBE = function readIntBE(offset, byteLength, noAssert) {
              offset = offset >>> 0;
              byteLength = byteLength >>> 0;
              if (!noAssert) {
                checkOffset(offset, byteLength, this.length);
              }

              var i = byteLength;
              var mul = 1;
              var val = this[offset + --i];
              while (i > 0 && (mul *= 0x100)) {
                val += this[offset + --i] * mul;
              }
              mul *= 0x80;

              if (val >= mul) {
                val -= Math.pow(2, 8 * byteLength);
              }

              return val;
            };

            Buffer.prototype.readInt8 = function readInt8(offset, noAssert) {
              offset = offset >>> 0;
              if (!noAssert) {
                checkOffset(offset, 1, this.length);
              }
              if (!(this[offset] & 0x80)) {
                return this[offset];
              }
              return (0xff - this[offset] + 1) * -1;
            };

            Buffer.prototype.readInt16LE = function readInt16LE(offset, noAssert) {
              offset = offset >>> 0;
              if (!noAssert) {
                checkOffset(offset, 2, this.length);
              }
              var val = this[offset] | (this[offset + 1] << 8);
              return val & 0x8000 ? val | 0xffff0000 : val;
            };

            Buffer.prototype.readInt16BE = function readInt16BE(offset, noAssert) {
              offset = offset >>> 0;
              if (!noAssert) {
                checkOffset(offset, 2, this.length);
              }
              var val = this[offset + 1] | (this[offset] << 8);
              return val & 0x8000 ? val | 0xffff0000 : val;
            };

            Buffer.prototype.readInt32LE = function readInt32LE(offset, noAssert) {
              offset = offset >>> 0;
              if (!noAssert) {
                checkOffset(offset, 4, this.length);
              }

              return this[offset] | (this[offset + 1] << 8) | (this[offset + 2] << 16) | (this[offset + 3] << 24);
            };

            Buffer.prototype.readInt32BE = function readInt32BE(offset, noAssert) {
              offset = offset >>> 0;
              if (!noAssert) {
                checkOffset(offset, 4, this.length);
              }

              return (this[offset] << 24) | (this[offset + 1] << 16) | (this[offset + 2] << 8) | this[offset + 3];
            };

            Buffer.prototype.readFloatLE = function readFloatLE(offset, noAssert) {
              offset = offset >>> 0;
              if (!noAssert) {
                checkOffset(offset, 4, this.length);
              }
              return ieee754.read(this, offset, true, 23, 4);
            };

            Buffer.prototype.readFloatBE = function readFloatBE(offset, noAssert) {
              offset = offset >>> 0;
              if (!noAssert) {
                checkOffset(offset, 4, this.length);
              }
              return ieee754.read(this, offset, false, 23, 4);
            };

            Buffer.prototype.readDoubleLE = function readDoubleLE(offset, noAssert) {
              offset = offset >>> 0;
              if (!noAssert) {
                checkOffset(offset, 8, this.length);
              }
              return ieee754.read(this, offset, true, 52, 8);
            };

            Buffer.prototype.readDoubleBE = function readDoubleBE(offset, noAssert) {
              offset = offset >>> 0;
              if (!noAssert) {
                checkOffset(offset, 8, this.length);
              }
              return ieee754.read(this, offset, false, 52, 8);
            };

            function checkInt(buf, value, offset, ext, max, min) {
              if (!Buffer.isBuffer(buf)) {
                throw new TypeError('"buffer" argument must be a Buffer instance');
              }
              if (value > max || value < min) {
                throw new RangeError('"value" argument is out of bounds');
              }
              if (offset + ext > buf.length) {
                throw new RangeError("Index out of range");
              }
            }

            Buffer.prototype.writeUIntLE = function writeUIntLE(value, offset, byteLength, noAssert) {
              value = +value;
              offset = offset >>> 0;
              byteLength = byteLength >>> 0;
              if (!noAssert) {
                var maxBytes = Math.pow(2, 8 * byteLength) - 1;
                checkInt(this, value, offset, byteLength, maxBytes, 0);
              }

              var mul = 1;
              var i = 0;
              this[offset] = value & 0xff;
              while (++i < byteLength && (mul *= 0x100)) {
                this[offset + i] = (value / mul) & 0xff;
              }

              return offset + byteLength;
            };

            Buffer.prototype.writeUIntBE = function writeUIntBE(value, offset, byteLength, noAssert) {
              value = +value;
              offset = offset >>> 0;
              byteLength = byteLength >>> 0;
              if (!noAssert) {
                var maxBytes = Math.pow(2, 8 * byteLength) - 1;
                checkInt(this, value, offset, byteLength, maxBytes, 0);
              }

              var i = byteLength - 1;
              var mul = 1;
              this[offset + i] = value & 0xff;
              while (--i >= 0 && (mul *= 0x100)) {
                this[offset + i] = (value / mul) & 0xff;
              }

              return offset + byteLength;
            };

            Buffer.prototype.writeUInt8 = function writeUInt8(value, offset, noAssert) {
              value = +value;
              offset = offset >>> 0;
              if (!noAssert) {
                checkInt(this, value, offset, 1, 0xff, 0);
              }
              this[offset] = value & 0xff;
              return offset + 1;
            };

            Buffer.prototype.writeUInt16LE = function writeUInt16LE(value, offset, noAssert) {
              value = +value;
              offset = offset >>> 0;
              if (!noAssert) {
                checkInt(this, value, offset, 2, 0xffff, 0);
              }
              this[offset] = value & 0xff;
              this[offset + 1] = value >>> 8;
              return offset + 2;
            };

            Buffer.prototype.writeUInt16BE = function writeUInt16BE(value, offset, noAssert) {
              value = +value;
              offset = offset >>> 0;
              if (!noAssert) {
                checkInt(this, value, offset, 2, 0xffff, 0);
              }
              this[offset] = value >>> 8;
              this[offset + 1] = value & 0xff;
              return offset + 2;
            };

            Buffer.prototype.writeUInt32LE = function writeUInt32LE(value, offset, noAssert) {
              value = +value;
              offset = offset >>> 0;
              if (!noAssert) {
                checkInt(this, value, offset, 4, 0xffffffff, 0);
              }
              this[offset + 3] = value >>> 24;
              this[offset + 2] = value >>> 16;
              this[offset + 1] = value >>> 8;
              this[offset] = value & 0xff;
              return offset + 4;
            };

            Buffer.prototype.writeUInt32BE = function writeUInt32BE(value, offset, noAssert) {
              value = +value;
              offset = offset >>> 0;
              if (!noAssert) {
                checkInt(this, value, offset, 4, 0xffffffff, 0);
              }
              this[offset] = value >>> 24;
              this[offset + 1] = value >>> 16;
              this[offset + 2] = value >>> 8;
              this[offset + 3] = value & 0xff;
              return offset + 4;
            };

            Buffer.prototype.writeIntLE = function writeIntLE(value, offset, byteLength, noAssert) {
              value = +value;
              offset = offset >>> 0;
              if (!noAssert) {
                var limit = Math.pow(2, 8 * byteLength - 1);

                checkInt(this, value, offset, byteLength, limit - 1, -limit);
              }

              var i = 0;
              var mul = 1;
              var sub = 0;
              this[offset] = value & 0xff;
              while (++i < byteLength && (mul *= 0x100)) {
                if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
                  sub = 1;
                }
                this[offset + i] = (((value / mul) >> 0) - sub) & 0xff;
              }

              return offset + byteLength;
            };

            Buffer.prototype.writeIntBE = function writeIntBE(value, offset, byteLength, noAssert) {
              value = +value;
              offset = offset >>> 0;
              if (!noAssert) {
                var limit = Math.pow(2, 8 * byteLength - 1);

                checkInt(this, value, offset, byteLength, limit - 1, -limit);
              }

              var i = byteLength - 1;
              var mul = 1;
              var sub = 0;
              this[offset + i] = value & 0xff;
              while (--i >= 0 && (mul *= 0x100)) {
                if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
                  sub = 1;
                }
                this[offset + i] = (((value / mul) >> 0) - sub) & 0xff;
              }

              return offset + byteLength;
            };

            Buffer.prototype.writeInt8 = function writeInt8(value, offset, noAssert) {
              value = +value;
              offset = offset >>> 0;
              if (!noAssert) {
                checkInt(this, value, offset, 1, 0x7f, -0x80);
              }
              if (value < 0) {
                value = 0xff + value + 1;
              }
              this[offset] = value & 0xff;
              return offset + 1;
            };

            Buffer.prototype.writeInt16LE = function writeInt16LE(value, offset, noAssert) {
              value = +value;
              offset = offset >>> 0;
              if (!noAssert) {
                checkInt(this, value, offset, 2, 0x7fff, -0x8000);
              }
              this[offset] = value & 0xff;
              this[offset + 1] = value >>> 8;
              return offset + 2;
            };

            Buffer.prototype.writeInt16BE = function writeInt16BE(value, offset, noAssert) {
              value = +value;
              offset = offset >>> 0;
              if (!noAssert) {
                checkInt(this, value, offset, 2, 0x7fff, -0x8000);
              }
              this[offset] = value >>> 8;
              this[offset + 1] = value & 0xff;
              return offset + 2;
            };

            Buffer.prototype.writeInt32LE = function writeInt32LE(value, offset, noAssert) {
              value = +value;
              offset = offset >>> 0;
              if (!noAssert) {
                checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
              }
              this[offset] = value & 0xff;
              this[offset + 1] = value >>> 8;
              this[offset + 2] = value >>> 16;
              this[offset + 3] = value >>> 24;
              return offset + 4;
            };

            Buffer.prototype.writeInt32BE = function writeInt32BE(value, offset, noAssert) {
              value = +value;
              offset = offset >>> 0;
              if (!noAssert) {
                checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
              }
              if (value < 0) {
                value = 0xffffffff + value + 1;
              }
              this[offset] = value >>> 24;
              this[offset + 1] = value >>> 16;
              this[offset + 2] = value >>> 8;
              this[offset + 3] = value & 0xff;
              return offset + 4;
            };

            function checkIEEE754(buf, value, offset, ext, max, min) {
              if (offset + ext > buf.length) {
                throw new RangeError("Index out of range");
              }
              if (offset < 0) {
                throw new RangeError("Index out of range");
              }
            }

            function writeFloat(buf, value, offset, littleEndian, noAssert) {
              value = +value;
              offset = offset >>> 0;
              if (!noAssert) {
                checkIEEE754(buf, value, offset, 4, 3.4028234663852886e38, -3.4028234663852886e38);
              }
              ieee754.write(buf, value, offset, littleEndian, 23, 4);
              return offset + 4;
            }

            Buffer.prototype.writeFloatLE = function writeFloatLE(value, offset, noAssert) {
              return writeFloat(this, value, offset, true, noAssert);
            };

            Buffer.prototype.writeFloatBE = function writeFloatBE(value, offset, noAssert) {
              return writeFloat(this, value, offset, false, noAssert);
            };

            function writeDouble(buf, value, offset, littleEndian, noAssert) {
              value = +value;
              offset = offset >>> 0;
              if (!noAssert) {
                checkIEEE754(buf, value, offset, 8, 1.7976931348623157e308, -1.7976931348623157e308);
              }
              ieee754.write(buf, value, offset, littleEndian, 52, 8);
              return offset + 8;
            }

            Buffer.prototype.writeDoubleLE = function writeDoubleLE(value, offset, noAssert) {
              return writeDouble(this, value, offset, true, noAssert);
            };

            Buffer.prototype.writeDoubleBE = function writeDoubleBE(value, offset, noAssert) {
              return writeDouble(this, value, offset, false, noAssert);
            };

            // copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
            Buffer.prototype.copy = function copy(target, targetStart, start, end) {
              if (!Buffer.isBuffer(target)) {
                throw new TypeError("argument should be a Buffer");
              }
              if (!start) {
                start = 0;
              }
              if (!end && end !== 0) {
                end = this.length;
              }
              if (targetStart >= target.length) {
                targetStart = target.length;
              }
              if (!targetStart) {
                targetStart = 0;
              }
              if (end > 0 && end < start) {
                end = start;
              }

              // Copy 0 bytes; we're done
              if (end === start) {
                return 0;
              }
              if (target.length === 0 || this.length === 0) {
                return 0;
              }

              // Fatal error conditions
              if (targetStart < 0) {
                throw new RangeError("targetStart out of bounds");
              }
              if (start < 0 || start >= this.length) {
                throw new RangeError("Index out of range");
              }
              if (end < 0) {
                throw new RangeError("sourceEnd out of bounds");
              }

              // Are we oob?
              if (end > this.length) {
                end = this.length;
              }
              if (target.length - targetStart < end - start) {
                end = target.length - targetStart + start;
              }

              var len = end - start;

              if (this === target && typeof Uint8Array.prototype.copyWithin === "function") {
                // Use built-in when available, missing from IE11
                this.copyWithin(targetStart, start, end);
              } else if (this === target && start < targetStart && targetStart < end) {
                // descending copy from end
                for (var i = len - 1; i >= 0; --i) {
                  target[i + targetStart] = this[i + start];
                }
              } else {
                Uint8Array.prototype.set.call(target, this.subarray(start, end), targetStart);
              }

              return len;
            };

            // Usage:
            //    buffer.fill(number[, offset[, end]])
            //    buffer.fill(buffer[, offset[, end]])
            //    buffer.fill(string[, offset[, end]][, encoding])
            Buffer.prototype.fill = function fill(val, start, end, encoding) {
              // Handle string cases:
              if (typeof val === "string") {
                if (typeof start === "string") {
                  encoding = start;
                  start = 0;
                  end = this.length;
                } else if (typeof end === "string") {
                  encoding = end;
                  end = this.length;
                }
                if (encoding !== undefined && typeof encoding !== "string") {
                  throw new TypeError("encoding must be a string");
                }
                if (typeof encoding === "string" && !Buffer.isEncoding(encoding)) {
                  throw new TypeError("Unknown encoding: " + encoding);
                }
                if (val.length === 1) {
                  var code = val.charCodeAt(0);
                  if ((encoding === "utf8" && code < 128) || encoding === "latin1") {
                    // Fast path: If `val` fits into a single byte, use that numeric value.
                    val = code;
                  }
                }
              } else if (typeof val === "number") {
                val = val & 255;
              }

              // Invalid ranges are not set to a default, so can range check early.
              if (start < 0 || this.length < start || this.length < end) {
                throw new RangeError("Out of range index");
              }

              if (end <= start) {
                return this;
              }

              start = start >>> 0;
              end = end === undefined ? this.length : end >>> 0;

              if (!val) {
                val = 0;
              }

              var i;
              if (typeof val === "number") {
                for (i = start; i < end; ++i) {
                  this[i] = val;
                }
              } else {
                var bytes = Buffer.isBuffer(val) ? val : Buffer.from(val, encoding);
                var len = bytes.length;
                if (len === 0) {
                  throw new TypeError('The value "' + val + '" is invalid for argument "value"');
                }
                for (i = 0; i < end - start; ++i) {
                  this[i + start] = bytes[i % len];
                }
              }

              return this;
            };

            // HELPER FUNCTIONS
            // ================

            var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g;

            function base64clean(str) {
              // Node takes equal signs as end of the Base64 encoding
              str = str.split("=")[0];
              // Node strips out invalid characters like \n and \t from the string, base64-js does not
              str = str.trim().replace(INVALID_BASE64_RE, "");
              // Node converts strings with length < 2 to ''
              if (str.length < 2) {
                return "";
              }
              // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
              while (str.length % 4 !== 0) {
                str = str + "=";
              }
              return str;
            }

            function toHex(n) {
              if (n < 16) {
                return "0" + n.toString(16);
              }
              return n.toString(16);
            }

            function utf8ToBytes(string, units) {
              units = units || Infinity;
              var codePoint;
              var length = string.length;
              var leadSurrogate = null;
              var bytes = [];

              for (var i = 0; i < length; ++i) {
                codePoint = string.charCodeAt(i);

                // is surrogate component
                if (codePoint > 0xd7ff && codePoint < 0xe000) {
                  // last char was a lead
                  if (!leadSurrogate) {
                    // no lead yet
                    if (codePoint > 0xdbff) {
                      // unexpected trail
                      if ((units -= 3) > -1) {
                        bytes.push(0xef, 0xbf, 0xbd);
                      }
                      continue;
                    } else if (i + 1 === length) {
                      // unpaired lead
                      if ((units -= 3) > -1) {
                        bytes.push(0xef, 0xbf, 0xbd);
                      }
                      continue;
                    }

                    // valid lead
                    leadSurrogate = codePoint;

                    continue;
                  }

                  // 2 leads in a row
                  if (codePoint < 0xdc00) {
                    if ((units -= 3) > -1) {
                      bytes.push(0xef, 0xbf, 0xbd);
                    }
                    leadSurrogate = codePoint;
                    continue;
                  }

                  // valid surrogate pair
                  codePoint = (((leadSurrogate - 0xd800) << 10) | (codePoint - 0xdc00)) + 0x10000;
                } else if (leadSurrogate) {
                  // valid bmp char, but last char was a lead
                  if ((units -= 3) > -1) {
                    bytes.push(0xef, 0xbf, 0xbd);
                  }
                }

                leadSurrogate = null;

                // encode utf8
                if (codePoint < 0x80) {
                  if ((units -= 1) < 0) {
                    break;
                  }
                  bytes.push(codePoint);
                } else if (codePoint < 0x800) {
                  if ((units -= 2) < 0) {
                    break;
                  }
                  bytes.push((codePoint >> 0x6) | 0xc0, (codePoint & 0x3f) | 0x80);
                } else if (codePoint < 0x10000) {
                  if ((units -= 3) < 0) {
                    break;
                  }
                  bytes.push((codePoint >> 0xc) | 0xe0, ((codePoint >> 0x6) & 0x3f) | 0x80, (codePoint & 0x3f) | 0x80);
                } else if (codePoint < 0x110000) {
                  if ((units -= 4) < 0) {
                    break;
                  }
                  bytes.push((codePoint >> 0x12) | 0xf0, ((codePoint >> 0xc) & 0x3f) | 0x80, ((codePoint >> 0x6) & 0x3f) | 0x80, (codePoint & 0x3f) | 0x80);
                } else {
                  throw new Error("Invalid code point");
                }
              }

              return bytes;
            }

            function asciiToBytes(str) {
              var byteArray = [];
              for (var i = 0; i < str.length; ++i) {
                // Node's code seems to be doing this and not & 0x7F..
                byteArray.push(str.charCodeAt(i) & 0xff);
              }
              return byteArray;
            }

            function utf16leToBytes(str, units) {
              var c, hi, lo;
              var byteArray = [];
              for (var i = 0; i < str.length; ++i) {
                if ((units -= 2) < 0) {
                  break;
                }

                c = str.charCodeAt(i);
                hi = c >> 8;
                lo = c % 256;
                byteArray.push(lo);
                byteArray.push(hi);
              }

              return byteArray;
            }

            function base64ToBytes(str) {
              return base64.toByteArray(base64clean(str));
            }

            function blitBuffer(src, dst, offset, length) {
              for (var i = 0; i < length; ++i) {
                if (i + offset >= dst.length || i >= src.length) {
                  break;
                }
                dst[i + offset] = src[i];
              }
              return i;
            }

            // ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
            // the `instanceof` check but they should be treated as of that type.
            // See: https://github.com/feross/buffer/issues/166
            function isInstance(obj, type) {
              return obj instanceof type || (obj != null && obj.constructor != null && obj.constructor.name != null && obj.constructor.name === type.name);
            }
            function numberIsNaN(obj) {
              // For IE11 support
              return obj !== obj; // eslint-disable-line no-self-compare
            }
          }.call(this));
        }.call(this, require("buffer").Buffer));
      },
      { "base64-js": 12, buffer: 13, ieee754: 14 }
    ],

    14: [
      function (require, module, exports) {
        /*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
        exports.read = function (buffer, offset, isLE, mLen, nBytes) {
          var e, m;
          var eLen = nBytes * 8 - mLen - 1;
          var eMax = (1 << eLen) - 1;
          var eBias = eMax >> 1;
          var nBits = -7;
          var i = isLE ? nBytes - 1 : 0;
          var d = isLE ? -1 : 1;
          var s = buffer[offset + i];

          i += d;

          e = s & ((1 << -nBits) - 1);
          s >>= -nBits;
          nBits += eLen;
          for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

          m = e & ((1 << -nBits) - 1);
          e >>= -nBits;
          nBits += mLen;
          for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

          if (e === 0) {
            e = 1 - eBias;
          } else if (e === eMax) {
            return m ? NaN : (s ? -1 : 1) * Infinity;
          } else {
            m = m + Math.pow(2, mLen);
            e = e - eBias;
          }
          return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
        };

        exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
          var e, m, c;
          var eLen = nBytes * 8 - mLen - 1;
          var eMax = (1 << eLen) - 1;
          var eBias = eMax >> 1;
          var rt = mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0;
          var i = isLE ? 0 : nBytes - 1;
          var d = isLE ? 1 : -1;
          var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

          value = Math.abs(value);

          if (isNaN(value) || value === Infinity) {
            m = isNaN(value) ? 1 : 0;
            e = eMax;
          } else {
            e = Math.floor(Math.log(value) / Math.LN2);
            if (value * (c = Math.pow(2, -e)) < 1) {
              e--;
              c *= 2;
            }
            if (e + eBias >= 1) {
              value += rt / c;
            } else {
              value += rt * Math.pow(2, 1 - eBias);
            }
            if (value * c >= 2) {
              e++;
              c /= 2;
            }

            if (e + eBias >= eMax) {
              m = 0;
              e = eMax;
            } else if (e + eBias >= 1) {
              m = (value * c - 1) * Math.pow(2, mLen);
              e = e + eBias;
            } else {
              m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
              e = 0;
            }
          }

          for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

          e = (e << mLen) | m;
          eLen += mLen;
          for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

          buffer[offset + i - d] |= s * 128;
        };
      },
      {}
    ]
  },

  {},
  [11]
);
