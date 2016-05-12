var pkg           = require('../package.json')
var debug         = require('./debug.js')(pkg.name);
var errorDebug    = require('./error-debug.js')

var util          = require('util');
var EventEmitter  = require('events');
var net           = require('net');
var PortLookup    = require('./port-lookup.js')

function PortWatcher (options, inactivityDuration, forwardAddress) {

  var that = this;

  var isCurrentlyActive = false;
  var activeSockets = 0;
  var activityTimeout;
  var canForward = false;
  var toForward = [];
  var lookup = new PortLookup(forwardAddress)

  var server = net.createServer();
  server.on('connection', function (socket) {
    debug('watcher got client')
    clearTimeout(activityTimeout);
    if(!isCurrentlyActive) {
      isCurrentlyActive = true;
      that.emit('active');
    }
    activeSockets++;
    socket.on('close', function () {
      activeSockets--;
      if(!activeSockets) {
        activityTimeout = setTimeout(function () {
          isCurrentlyActive = false;
          that.emit('inactive');
        }, inactivityDuration)
      }
    })
    if (forwardAddress) {
      if (canForward) that._forwardSocket(socket)
      else toForward.push(socket);
    }
  })
  that.on('active', function () {
    debug('watcher active');
  })
  that.on('inactive', function () {
    debug('watcher inactive');
  })
  server.on('error', (err) => {
    that.emit('error', err);
  });
  server.on('close', () => {
    debug('watcher server.close')
  });
  server.on('listening', () => {
    debug('watcher listening %j', options);
  });
  process.nextTick(function () {
    server.listen(options);
  })

  this._forwardSocket = function (socket) {
    var forwarder = net.createConnection(forwardAddress, () => {
      socket.on('data', forwarder.write.bind(forwarder));
      forwarder.on('data', socket.write.bind(socket));
    });
    var endASocket = function (s, name) {
      return function () {
        name && debug(name)
        s && s.end();
        s && s.destroy();
        s && s.removeAllListeners('data')
        s && s.removeAllListeners('close')
        s && s.removeAllListeners('end')
        s = null;
      }
    }
    socket.once('close', endASocket(forwarder, 'socket.close'))
    socket.once('end', endASocket(forwarder, 'socket.end'))
    forwarder.once('close', endASocket(socket, 'forwarder.end'))
    forwarder.once('end', endASocket(socket, 'forwarder.end'))
    errorDebug(socket, 'watcher.socket')
    errorDebug(forwarder, 'watcher.forwarder')
  }

  this.startForward = function () {
    debug('watcher forward start %j', forwardAddress)
    lookup.once('found', function () {
      debug('watcher forward ready')
      canForward = true;
      toForward.splice(0).forEach(that._forwardSocket.bind(that))
    })
    lookup.startLookup();
  }

  this.stopForward = function () {
    debug('watcher forward stop')
    lookup.removeAllListeners('found');
    lookup.stopLookup();
    canForward = false;
  }

  this.destroy = function (then) {
    debug('watcher destroy')
    this.stopForward();
    toForward.splice(0).forEach(function (s) {
      s.end();
    })
    server.close(then);
  }
}

util.inherits(PortWatcher, EventEmitter);

module.exports = PortWatcher;
