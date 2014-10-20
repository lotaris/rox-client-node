var ioc = require('./ioc');

exports.client = ioc.create('client');

exports.Config = ioc.create('config');
exports.TestRun = ioc.create('testRun');

exports.api = ioc.create('api');
exports.payload = ioc.create('payload');
exports.publisher = ioc.create('publisher');
exports.uid = ioc.create('uid');

exports.version = require('../package').version;
