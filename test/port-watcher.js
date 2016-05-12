require('should')

var miss        = require('mississippi')
var pkg         = require('../package.json')
var debug       = require('../lib/debug.js')(pkg.name);
var net         = require('net');
var PortWatcher = require('../lib/port-watcher.js')

var debugStream   = require('../lib/debug.js').stream;
debugStream.pipe(process.stderr);

describe('port-watcher', function () {
  it('detects when a port is consumed', function (done) {
    var activeEvents = 0;
    var inactiveEvents = 0;

    var watcher = new PortWatcher(5978, 2000);
    watcher.on('active', function () {
      activeEvents++;
    })
    watcher.on('inactive', function () {
      inactiveEvents++;
    })
    var client = net.createConnection({port: 5978}, () => {
      client.end();
      setTimeout(function () {
        activeEvents.should.eql(1)
        inactiveEvents.should.eql(0);
        watcher.destroy(function () {
          done();
        })
      }, 500)
    });
  });
  it('fails when the port is not available', function (done) {
    var server = net.createServer();
    server.on('listening', function () {
      var watcher = new PortWatcher(5978, 500)
      watcher.on('error', function () {
        server.close(function () {
          done();
        });
      })
    })
    server.listen(5978)
  })
  it('emits inactive when the is no more activity', function (done) {
    var activeEvents = 0;
    var inactiveEvents = 0;

    var watcher = new PortWatcher(5978, 50);
    watcher.on('active', function () {
      activeEvents++;
    })
    watcher.on('inactive', function () {
      inactiveEvents++;
    })
    var client = net.createConnection({port: 5978}, () => {
      client.end();
      setTimeout(function () {
        activeEvents.should.eql(1)
        inactiveEvents.should.eql(1);
        watcher.destroy(function () {
          done();
        })
      }, 500)
    });
  })
  it('can forward sockets to a remote', function (done) {
    var watcher = new PortWatcher(5978, 500, 5980);
    watcher.startForward();
    var server = net.createServer(function (c) {
      c.once('data', function (d) {
        d.toString().should.eql('tomate')
        c.end();
        server.close()
        watcher.destroy(function () {
          done();
        })
      });
    });
    server.listen(5980)
    var client = net.createConnection({port: 5978}, () => {
      client.end('tomate');
    });
  })
  it('can forward sockets to a lazy remote', function (done) {
    var watcher = new PortWatcher(5978, 500, 5980);
    watcher.startForward();
    setTimeout(function () {
      var server = net.createServer(function (c) {
        c.once('data', function (d) {
          d.toString().should.eql('tomate')
          c.end();
          server.close()
          done();
        });
      });
      server.listen(5980)
    }, 1000)
    var client = net.createConnection({port: 5978}, () => {
      client.end('tomate');
    });
  })
})
