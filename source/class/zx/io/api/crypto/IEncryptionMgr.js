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
 * Interface for a class which provides encryption and decryption services
 * acroll the transmission medium used for Remote APIs
 */
qx.Interface.define("zx.io.api.crypto.IEncryptionMgr", {
  members: {
    /**
     *
     * @param {string} data Original data to encrypt
     * @returns {*} Encrypted data
     */
    encryptData(data) {},

    /**
     * @param {*} data Encrypted data to decrypt
     * @returns {string} Decrypted data
     */
    decryptData(data) {}
  }
});
