var pkg           = require('../package.json')
var debug         = require('./debug.js')(pkg.name);

var ip            = require('ip');
var net           = require('net');
var url           = require('url');

//todo refactor.

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

  var pendingTout;
  function tryConnect () {
    debug('tryConnect lookup %j', lookup);
    if(!shouldStop) {
      var c = net.createConnection(lookup, () => {
        debug('resolve lookup %j', lookup);
        !shouldStop && then();
        c.end();
      }).on('error', function () {
        if(!shouldStop) {
          pendingTout = setTimeout(function () {
            !shouldStop && tryConnect();
          }, 500)
        }
      })
    }
  }
  tryConnect();

  return function release () {
    debug('release lookup %j', lookup);
    clearTimeout(pendingTout);
    shouldStop = true;
  }
}

module.exports = portLookup;
