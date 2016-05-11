var pkg           = require('./package.json')
var errorDebug    = require('./lib/error-debug.js')
var debug         = require('./lib/debug.js')(pkg.name);
var debugStream   = require('./lib/debug.js').stream;

errorDebug(debugStream, 'debug.stream')
errorDebug(process.stderr, 'process.stderr')
debugStream.pipe(process.stderr);

var argv          = require('minimist')(process.argv);
var ip            = require('ip')
var AtMost        = require('./lib/at-most.js')
var KeepAlive     = require('./lib/keep-alive.js')
var PortWatcher   = require('./lib/port-watcher.js')
var Connector     = require("./lib/connector.js")

// remove nodejs and this script path.
argv['_'].shift();argv['_'].shift();

// prepend this nodejs if the bin is a js file.
if (argv['_'][0].match(/\.js$/))
  argv['_'].unshift(process.argv[0]);

debug('argv %j', argv)

var retryTimespan   = 'retrytimespan' in argv ? argv.retrytimespan * 60 : 1000 * 60 * 1;
var retryTimes      = 'retry' in argv ? parseInt(argv.retry) : 3;

var watchAddress    = argv.watchaddress;
var watchForward    = argv.watchforward;
var watchInativity  = 'watchinactvity' in argv ? argv.watchinactvity * 60 : 1000 * 60 * 1;

var stdoutRedirect  = argv.stdout;
var stderrRedirect  = argv.stderr;

var bin = argv['_'].shift();
var binArgs = argv['_'];

// transforms watchAddress / watchForward
// into an option object
// if it is not a port number only

if (watchAddress && watchAddress.toString().match(/[^0-9]/)) {
  var uri  = require('url').parse(watchAddress);
  var host = uri.hostname || uri.host;
  watchAddress = {
    port: uri.port,
    host: host,
    family: (ip.isV4Format(host) && '4') || (ip.isV6Format(host) && '6') || null
  };
}

if (watchForward && watchForward.toString().match(/[^0-9]/)) {
  var uri  = require('url').parse(watchForward);
  var host = uri.hostname || uri.host;
  watchForward = {
    port: uri.port,
    host: host,
    family: (ip.isV4Format(host) && '4') || (ip.isV6Format(host) && '6') || null
  };
}

// ok, let s go.
var most    = new AtMost(retryTimes, retryTimespan);
var ka      = new KeepAlive(bin, binArgs, {stdio: 'pipe'});

var watcher;
if (watchAddress)
  watcher = new PortWatcher(watchAddress, watchInativity, watchForward);

var co = new Connector();

co.enable(stdoutRedirect, stderrRedirect);
debugStream.pipe(co.stderr);

errorDebug(co, 'connector')
watcher && errorDebug(watcher, 'watcher')

watcher && ka.leftForDead();
watcher && watcher.on('active', function () {
  debug('watcher being active')
  ka.once('start', function (child) {
    watcher.startForward();
    watcher.once('inactive', function () {
      debug('watcher being inactive')
      watcher.stopForward();
      ka.leftForDead()
      child.kill('SIGTERM');
    })
  })
  ka.keepAlive();
  ka.start();
})
watcher && watcher.on('error', function (err) {
  // port to watch unavailable
  // let s just quit.
  process.exit(1);
})

ka.on('close', function (child) {
  debug('child.close')
  co.disconnect(child);
  most.eventOccured();
  if (most.hasExceeded()) {
    debug("re spawned too often, leaving for dead")
    ka.leftForDead();
    co.destroy();
  }
})
ka.on('start', function (child) {
  debug("child.event start pid=%s", child.pid)
  co.connect(child)
  process.once('SIGINT', function () {
    debug("child.send SIGINT")
    child.kill('SIGINT')
  })
  process.once('SIGTERM', function () {
    debug("child.send SIGTERM")
    child.kill('SIGTERM')
  })
  child.on('exit', function (code, sign) {
    debug("child.event exit code=%s signal=%s", code, sign)
  })
  child.on('close', function (code, sign) {
    debug("child.event close code=%s signal=%s", code, sign)
  })
  errorDebug(child, 'child')
  errorDebug(child.stdin, 'child.stdin')
  errorDebug(child.stdout, 'child.stdout')
  errorDebug(child.stderr, 'child.stderr')
})

!watcher && ka.keepAlive();
!watcher && ka.start();
