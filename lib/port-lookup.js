var pkg           = require('../package.json')
var debug         = require('./debug.js')(pkg.name);

var ip            = require('ip');
var net           = require('net');
var url           = require('url');

var portLookup = function (lookup, then) {
  var shouldStop = false;

  if (typeof(lookup)==='string') {
    lookup = url.parse(lookup);
    if (lookup.protocol==='tcp:') {
      var host = lookup.hostname || lookup.host;
      lookup = {
        host: host,
        port: lookup.port,
        family: ip.isV4Format(host) ? 4 : 6,
      }
    }
  }

  debug('port lookup %j', lookup);

  function tryConnect () {
    if(!shouldStop) {
      net.createConnection(lookup, () => {
        debug('resolve lookup %j', lookup);
        !shouldStop && then();
      }).on('error', function () {
        setTimeout(function () {
          !shouldStop && tryConnect();
        }, 500)
      })
    }
  }
  tryConnect();

  return function release () {
    debug('release lookup %j', lookup);
    shouldStop = true;
  }
}

module.exports = portLookup;
