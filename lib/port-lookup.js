var pkg           = require('../package.json')
var debug         = require('./debug.js')(pkg.name);
var util          = require('util');
var EventEmitter  = require('events');

var ip            = require('ip');
var net           = require('net');
var url           = require('url');
var uriToStream   = require('@mh-cbon/uri-to-stream');

var PortLookup = function (lookup) {

  var that = this;
  var lookupAddress;
  var islookingUp;
  lookup = uriToStream.tcpUriToOpts(lookup);

  var doLookup = function (done) {
    if (!islookingUp) return;
    var c = net.createConnection(lookup, () => {
      debug('doLookup resolve %j', lookup);
      c.end();
      done();
    }).on('error', function () {
      debug('doLookup failed %j', lookup);
        setTimeout(function () {
          doLookup(done);
        }, 500)
    })
    debug('doLookup start %j', lookup);
  }

  this.startLookup = function () {
    islookingUp = true;
    doLookup(function () {
      if (islookingUp) that.emit('found')
      that.stopLookup();
    })
  }
  this.stopLookup = function () {
    islookingUp = false;
  }
}

util.inherits(PortLookup, EventEmitter);

module.exports = PortLookup;
