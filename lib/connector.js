var pkg           = require('../package.json')
var debug         = require('./debug.js')(pkg.name);
var errorDebug    = require('./error-debug.js')

var url           = require('url');
var uriToStream   = require('@mh-cbon/uri-to-stream');
var util          = require('util');
var EventEmitter  = require('events');
var miss          = require('mississippi');
var portLookup    = require('./port-lookup.js')

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

    var pipeStdout = function () {
      if(stdout) {
        that.emit('open.remote.stdout')
        remoteStdout = uriToStream.write(stdout);
        remoteStdout.on('error', function (err) {
          that.emit('error', err)
          childStdout && childStdout.pause();
        })
        childStdout && childStdout.on('data', function (data) {
          remoteStdout && remoteStdout.write(data);
        })
        remoteStdout.on('end', function () {
          childStdout && childStdout.removeAllListeners('data');
          childStdout && childStdout.pause();
          that.emit('end.remote.stdout')
          process.nextTick(handleStdout);
        });
        childStdout && childStdout.resume();
      }
    }
    var pipeStderr = function () {
      if (stderr) {
        that.emit('open.remote.stderr')
        remoteStderr = uriToStream.write(stderr);
        remoteStderr.on('error', function (err) {
          that.emit('error', err)
          childStderr && childStderr.pause();
        })
        childStderr && childStderr.on('data', function (data) {
          remoteStderr && remoteStderr.write(data);
        })
        remoteStderr.on('end', function () {
          childStderr && childStderr.removeAllListeners('data');
          childStderr && childStderr.pause();
          that.emit('end.remote.stderr')
          process.nextTick(handleStderr);
        })
        childStderr && childStderr.resume();
      }
    }

    var handleStdout = function () {
      if (typeof(stdout)==='string' && stdout.match(/^(tcp|http)/)) {
        stdoutLookupRelease = portLookup(stdout, pipeStdout)
      } else if(stdout) pipeStdout();
    }
    handleStdout();

    var handleStderr = function () {
      if (typeof(stderr)==='string' && stderr.match(/^(tcp|http)/)) {
        stderrLookupRelease = portLookup(stderr, pipeStderr)
      } else if(stderr) pipeStderr();
    };
    handleStderr();

  }

  this.disable = function () {
    stdoutLookupRelease && stdoutLookupRelease();
    stderrLookupRelease && stderrLookupRelease();
    childStdout && childStdout.removeAllListeners('data')
    childStderr && childStderr.removeAllListeners('data')
  }

  this.destroy = function () {
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
