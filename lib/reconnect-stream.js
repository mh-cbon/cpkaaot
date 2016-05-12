
var PortLookup    = require('./port-lookup.js')
var miss          = require('mississippi')
var uriToStream   = require('@mh-cbon/uri-to-stream');
var pkg           = require('../package.json')
var debug         = require('./debug.js')(pkg.name);
var errorDebug    = require('./error-debug.js')

var reconnecStream = function (uri, opts) {
  var stream = miss.through();
  var remoteStream;

  var isTcp = uriToStream.isTcpUri(uri);
  var isHttp = uriToStream.isTcpUri(uri);

  debug('reconnecStream uri=%j isTcp=%j isHttp=%j', uri, isTcp, isHttp)

  if (isTcp || isHttp) {
    var opts = uriToStream.tcpUriToOpts(uri);
    var lookup = new PortLookup(opts);

    stream.once('end', function () {
      debug('reconnecStream destroy the remote')
      lookup.stopLookup();
      remoteStream && remoteStream.destroy();
    })
    var remoteConnect = function () {
      debug('reconnecStream connect')
      stream.pause();
      lookup.startLookup();
      lookup.once('found', function () {
        debug('reconnecStream open.remote')
        remoteStream = uriToStream.write(uri, opts);
        var write = function (d) {
          remoteStream.write(d)
        }
        stream.on('data', write)
        remoteStream.on('connect', function () {
          stream.emit('open.remote');
          stream.resume();
        })
        remoteStream.once('end', function () {
          stream.pause();
          stream.removeListener('data', write)
          debug('reconnecStream remoteStream.end')
          stream.emit('end.remote');
        })
        remoteStream.once('error', function (err) {
          stream.emit('error', err);
        })
        remoteStream.once('end', remoteConnect);
      })
    }
    remoteConnect();

  } else {
    remoteStream = uriToStream.write(uri, opts);
    stream.pipe(remoteStream);
  }

  return stream;
}

module.exports = reconnecStream;
