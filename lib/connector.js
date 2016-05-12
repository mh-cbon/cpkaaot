var pkg           = require('../package.json')
var debug         = require('./debug.js')(pkg.name);
var errorDebug    = require('./error-debug.js')

var url             = require('url');
var util            = require('util');
var EventEmitter    = require('events');
var miss            = require('mississippi');
var reconnecStream  = require('./reconnect-stream.js')

var Connector = function () {

  var that = this;

  var remoteStdout;
  var remoteStderr;
  var childStdout = miss.through();
  var childStderr = miss.through();
  errorDebug(childStdout, 'connector.childStdout')
  errorDebug(childStderr, 'connector.childStderr')

  this.stdout = miss.through();
  this.stderr = miss.through();
  this.stdout.pipe(childStdout);
  this.stderr.pipe(childStderr);
  errorDebug(this.stdout, 'connector.stdout')
  errorDebug(this.stderr, 'connector.stderr')

  this.connect = function (child) {
    child.stdout.on('data', function (data) {
      childStdout.write(data);
    })
    child.stderr.on('data', function (data) {
      childStderr.write(data);
    })
  }

  this.disconnect = function (child) {
    child.stdout.removeAllListeners('data')
    child.stderr.removeAllListeners('data')
  }

  var stdoutLookupRelease;
  var stderrLookupRelease;

  this.enable = function (stdout, stderr) {
    that.disable();

    if(stdout) {
      if (stdout.write) { // it is yet a stream
        that.emit('open.remote.stdout');
        remoteStdout = miss.through();
        remoteStdout.pipe(stdout);
        remoteStdout.once('end', function () {
          that.emit('end.remote.stdout');
        })
      } else {
        remoteStdout = reconnecStream(stdout);
        remoteStdout.on('error', function (err) {
          that.emit('error', err)
        })
        remoteStdout.on('open.remote', function () {
          debug('connector remoteStdout.open')
          that.emit('open.remote.stdout');
        })
        remoteStdout.on('end.remote', function () {
          debug('connector remoteStdout.end')
          that.emit('end.remote.stdout');
        })
      }
      childStdout && childStdout.on('data', function (data) {
        remoteStdout.write(data);
      })
    }

    if(stderr) {
      if (stderr.write) { // it is yet a stream
        that.emit('open.remote.stderr');
        remoteStderr = miss.through();
        remoteStderr.pipe(stderr);
        remoteStderr.once('end', function () {
          that.emit('end.remote.stderr');
        })
      } else {
        remoteStderr = reconnecStream(stderr);
        remoteStderr.on('error', function (err) {
          that.emit('error', err)
        })
        remoteStderr.on('open.remote', function () {
          debug('connector remoteStderr.end')
          that.emit('open.remote.stderr');
        })
        remoteStderr.on('end.remote', function () {
          debug('connector remoteStderr.end')
          that.emit('end.remote.stderr');
        })
      }
      childStderr && childStderr.on('data', function (data) {
        remoteStderr.write(data);
      })
    }
  }

  this.disable = function () {
    debug('connector disable')
    childStdout && childStdout.removeAllListeners('data')
    childStderr && childStderr.removeAllListeners('data')
  }

  this.destroy = function () {
    debug('connector destroy')
    that.disable();
    remoteStdout && remoteStdout.end();
    remoteStderr && remoteStderr.end();
    childStdout && childStdout.end();
    childStderr && childStderr.end();
    this.stdout.end();
    this.stderr.end();
    remoteStdout = null;
    remoteStderr = null;
    childStdout = null;
    childStderr = null;
  }
}

util.inherits(Connector, EventEmitter);

module.exports = Connector;
