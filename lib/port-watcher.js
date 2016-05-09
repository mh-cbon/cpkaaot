var util = require('util');
var EventEmitter = require('events');

function PortWatcher (options, inactivityDuration) {

  var that = this;

  var isCurrentlyActive = false;
  var activeSockets = 0;
  var activityTimeout;

  var net = require('net');
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
  })
  server.on('error', (err) => {
    that.emit('error', err);
  });
  server.listen(options);
}

util.inherits(PortWatcher, EventEmitter);

module.exports = PortWatcher;
