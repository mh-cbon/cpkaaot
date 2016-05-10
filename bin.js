var pkg           = require('./package.json')
var debug         = require('./lib/debug.js')(pkg.name);
var debugStream   = require('./lib/debug.js').stream;

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

watcher && ka.leftForDead();
watcher && watcher.on('active', function () {
  ka.once('start', function (child) {
    watcher.startForward();
    watcher.once('inactive', function () {
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
co.on('error', debug.bind(debug))

ka.on('close', function (child) {
  co.disconnect(child);
  most.eventOccured();
  if (most.hasExceeded()) {
    ka.leftForDead();
    co.destroy();
  }
})
ka.on('start', function (child) {
  co.connect(child)
  process.once('SIGINT', function () {
    child.kill('SIGINT')
  })
  process.once('SIGTERM', function () {
    console.log('GOT SIGTERM')
    child.kill('SIGTERM')
  })
})

process.nextTick(function () {
  !watcher && ka.keepAlive();
  !watcher && ka.start();
})



// following provides debug informations
watcher && watcher.on('active', function () {
  debug('watcher being active')
  ka.once('start', function (child) {
    watcher.once('inactive', function () {
      debug('watcher being inactive')
    })
  })
})
ka.on('close', function (child) {
  if (most.hasExceeded()) {
    debug("re spawned too often, leaving for dead")
  } else {
    debug("can continue")
  }
})
ka.on('start', function (child) {
  debug("child.event start")
  child.on('exit', function () {
    debug("child.event exit")
  })
  child.on('close', function () {
    debug("child.event close")
  })
  child.stdin.on('error', function () {
    debug('error')
  })
})
