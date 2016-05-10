var pkg           = require('../package.json')
var debug         = require('./debug.js')(pkg.name);

var util          = require('util');
var EventEmitter  = require('events');
var net           = require('net');
var portLookup    = require('./port-lookup.js')

function PortWatcher (options, inactivityDuration, forwardAddress) {

  var that = this;

  var isCurrentlyActive = false;
  var activeSockets = 0;
  var activityTimeout;
  var canForward = false;
  var toForward = [];

  var server = net.createServer();
  server.on('connection', function (socket) {
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
  server.on('error', (err) => {
    that.emit('error', err);
  });
  debug('watcher listens %j', options)
  server.listen(options);

  this._forwardSocket = function (socket) {
    var forwarder = net.createConnection(forwardAddress, () => {
      socket.on('data', forwarder.write.bind(forwarder));
      forwarder.on('data', socket.write.bind(socket));
    });
    socket.once('close', function () {
      // console.log('socket close');
      forwarder && forwarder.removeAllListeners('data')
      forwarder && forwarder.end();
      forwarder = null;
    })
    forwarder.once('close', function () {
      // console.log('forwarder close');
      socket && socket.removeAllListeners('data')
      socket && socket.end();
      socket = null;
    })
    socket.on('error', function (err) {
      debug('socket err=%j', err);
    })
    forwarder.on('error', function (err) {
      debug('forwarder err=%j', err);
    })
  }

  var lookupRelease;
  this.startForward = function () {
    debug('watcher forward %j', forwardAddress)
    portLookup(forwardAddress, function () {
      canForward = true;
      toForward.splice(0).forEach(that._forwardSocket.bind(that))
    })
  }

  this.stopForward = function () {
    lookupRelease && lookupRelease();
    canForward = false;
  }
}

util.inherits(PortWatcher, EventEmitter);

module.exports = PortWatcher;
