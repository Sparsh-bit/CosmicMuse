'use strict';
const crypto = require('crypto');

const newId = (prefix) => `${prefix}_${crypto.randomBytes(9).toString('hex')}`;

module.exports = { newId };
