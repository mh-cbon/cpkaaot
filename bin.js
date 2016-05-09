var argv = require('minimist')(process.argv);
var AtMost = require('./lib/at-most.js')
var KeepAlive = require('./lib/keep-alive.js')
var PortWatcher = require('./lib/port-watcher.js')
var Connector = require("./lib/connector.js")

argv['_'].shift();argv['_'].shift();

if (argv['_'][0].match(/\.js$/)) argv['_'].unshift(process.argv[0]);

var most    = new AtMost(argv.retry || 3, argv.retryduration || 1000 * 60 * 1);
var ka      = new KeepAlive(argv['_'].shift(), argv['_'], {stdio: 'pipe'});

var watcher;
if (argv.port)
  watcher = new PortWatcher(argv.watchaddress, argv.watchinactvity || 1000 * 60 * 10, argv.watchforward);

var co;
if (argv.stdout || argv.stderr)
  co = new Connector(argv.stdout, argv.stderr);

if (!watcher) {
  ka.keepAlive();
} else {
  ka.leftForDead();

  watcher.on('active', function () {
    ka.once('start', function (child) {
      watcher.once('inactive', function () {
        ka.leftForDead()
        child.kill();
      })
    })
    ka.keepAlive();
    ka.start();
  })
}
ka.on('close', function (child) {
  co && co.disconnect(child)
  most.eventOccured();
  if (most.hasExceeded()) {
    ka.leftForDead();
  }
})
ka.on('start', function (child) {
  co && co.connect(child)
})





watcher && watcher.on('active', function () {
  console.log('watcher being active')
  ka.once('start', function (child) {
    watcher.once('inactive', function () {
      console.log('watcher being inactive')
    })
  })
})
ka.on('close', function (child) {
  if (most.hasExceeded()) {
    console.log("re spawned too often")
  } else {
    console.log("can continue")
  }
})
ka.on('close', function (child) {
  process.stdin.unpipe(child.stdin);
  process.stdin.removeAllListeners('data');
  process.stdin.pause();
})
ka.on('start', function (child) {
  console.log("child.event start")
  process.stdin.pipe(child.stdin);
  process.stdin.on('data', function (d) {
    if (d.toString()==='kill\n') {
      child.kill();
    }
  })
  child.on('exit', function () {
    console.log("child.event exit")
  })
  child.on('close', function () {
    console.log("child.event close")
  })
  child.stdin.on('error', function () {
    console.log('error')
  })
})
