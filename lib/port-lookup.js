var pkg           = require('../package.json')
var debug         = require('./debug.js')(pkg.name);

var net           = require('net');

var portLookup = function (lookup, then) {
  var hasConnected = false;
  var shouldStop = false;

  debug('port lookup %j', lookup);

  function tryConnect () {
    if(!shouldStop) {
      net.createConnection(lookup, () => {
        hasConnected = true;
        debug('resolve lookup %j', lookup);
        then();
      }).on('error', function () {
        setTimeout(function () {
          tryConnect();
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
