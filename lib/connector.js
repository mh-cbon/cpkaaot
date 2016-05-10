var pkg           = require('../package.json')
var debug         = require('./debug.js')(pkg.name);

var url           = require('url');
var uriToStream   = require('@mh-cbon/uri-to-stream');
var util          = require('util');
var EventEmitter  = require('events');
var miss          = require('mississippi');
var portLookup    = require('./port-lookup.js')

var Logger = function () {

  var that = this;

  var remoteStdout;
  var remoteStderr;
  var childStdout = miss.through();
  var childStderr = miss.through();

  this.stdout = miss.through();
  this.stderr = miss.through();
  this.stdout.pipe(childStdout);
  this.stderr.pipe(childStderr);

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
      remoteStdout = stdout && uriToStream.write(stdout);
      remoteStdout && remoteStdout.on('error', function (err) {
        that.emit('error', err)
        childStdout.pause();
      })
      remoteStdout && childStdout.on('data', function (data) {
        remoteStdout.write(data);
      })
      remoteStdout && remoteStdout.on('end', function () {
        childStdout.removeAllListeners('data');
        childStdout.pause();
        handleStdout();
      });
      childStdout.resume();
    }
    var pipeStderr = function () {
      remoteStderr = stderr && uriToStream.write(stderr);
      remoteStderr && remoteStderr.on('error', function (err) {
        that.emit('error', err)
        childStderr.pause();
      })
      remoteStderr && childStderr.on('data', function (data) {
        remoteStderr.write(data);
      })
      remoteStderr && remoteStderr.on('end', function () {
        childStderr.removeAllListeners('data');
        childStderr.pause();
        handleStderr();
      })
      childStderr.resume();
    }

    var handleStdout = function () {
      if (stdout.match(/^(tcp|http)/)) {
        var opts = url.parse(stdout);
        if (opts.protocol==='tcp:') {
          opts.host = opts.hostname;
          delete opts.hostname;
        }
        stdoutLookupRelease = portLookup({port: opts.port, host: opts.host}, pipeStdout)
      }
      else pipeStdout();
    }
    handleStdout();

    var handleStderr = function () {
      if (stderr.match(/^(tcp|http)/)) {
        var opts = url.parse(stderr);
        if (opts.protocol==='tcp:') {
          opts.host = opts.hostname;
          delete opts.hostname;
        }
        stderrLookupRelease = portLookup({port: opts.port, host: opts.host}, pipeStderr)
      } else pipeStderr();
    };
    handleStderr();

  }

  this.disable = function () {
    stdoutLookupRelease && stdoutLookupRelease();
    stderrLookupRelease && stderrLookupRelease();
    remoteStdout && childStdout.removeAllListeners('data')
    remoteStderr && childStderr.removeAllListeners('data')
  }

  this.destroy = function () {
    that.disable();
    remoteStdout && remoteStdout.end();
    remoteStderr && remoteStderr.end();
    childStdout.end();
    childStderr.end();
    remoteStdout = null;
    remoteStderr = null;
    childStdout = null;
    childStderr = null;
  }
}

util.inherits(Logger, EventEmitter);

module.exports = Logger;
