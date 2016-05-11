require('should')

var net       = require('net');
var miss      = require('mississippi')
var Connector = require('../lib/connector.js')

describe('connector', function () {
  it('can make new instance and receive data without throwing error', function (done) {
    var co = new Connector();
    co.on('error', done)
    var stream = miss.through();
    stream.pipe(co.stdout)
    co.stdout.on('data', function () {
      co.disable();
      co.destroy();
      done();
    })
    stream.end('Oh oh')
  })
  it('can wait for stdout remote to be online', function (done) {
    var opened = false;
    var co = new Connector();
    co.on('error', function (){ /* void */ })
    co.enable('tcp://127.0.0.1:8154')
    setTimeout(function () {
      var server = net.createServer((c) => {
        c.end();
        server.close(function () {
          opened.should.eql(true);
          co.destroy();
          done();
        });
      });
      server.listen(8154, '127.0.0.1')
      co.once('open.remote.stdout', function () {
        opened = true;
      })
    }, 500)
  })
  it('can wait for stderr remote to be online', function (done) {
    var opened = false;
    var co = new Connector();
    co.on('error', function (){ /* void */ })
    co.enable(null, 'tcp://127.0.0.1:8154')
    setTimeout(function () {
      var server = net.createServer((c) => {
        c.end();
        server.close(function () {
          opened.should.eql(true);
          co.destroy();
          done();
        });
      });
      server.listen(8154, '127.0.0.1')
      co.once('open.remote.stderr', function () {
        opened = true;
      })
    }, 500)
  })
  it('can reconnect stdout remote', function (done) {
    var events = '';
    var cnt = 0;
    var co = new Connector();
    co.on('error', function (){ /* void */ })
    co.enable('tcp://127.0.0.1:8154')
    var server = net.createServer((c) => {
      c.end();
      if (cnt>2) {
        server.close(function () {
          events.should.eql('openendopenend')
          co.destroy();
          done();
        });
      }
      cnt++;
    }).listen(8154, '127.0.0.1')
    co.on('open.remote.stdout', function () {
      events += 'open';
    })
    co.on('end.remote.stdout', function () {
      events += 'end';
    })
  })
  it('can reconnect stderr remote', function (done) {
    var events = '';
    var cnt = 0;
    var co = new Connector();
    co.on('error', function (){ /* void */ })
    co.enable(null, 'tcp://127.0.0.1:8155')
    var server = net.createServer((c) => {
      c.end();
      if (cnt>2) {
        server.close(function () {
          events.should.eql('openendopenend');
          co.destroy();
          done();
        });
      }
      cnt++;
    }).listen(8155, '127.0.0.1')
    co.on('open.remote.stderr', function () {
      events += 'open';
    })
    co.on('end.remote.stderr', function () {
      events += 'end';
    })
  })
  it('can buffer data if stdout remote goes offline', function (done) {
    var data = '';
    var cnt = 0;
    var co = new Connector();
    co.on('error', function (){ /* void */ })
    co.enable('tcp://127.0.0.1:8156')
    var server = net.createServer((c) => {
      c.on('data', function (d) {
        data+=d.toString();
      })
      c.end();
      if (cnt>2) {
        co.destroy();
        server.close(function () {
          data.should.eql('open1end2open3')
          done();
        });
      }
      cnt++;
    }).listen(8156, '127.0.0.1')
    co.on('open.remote.stdout', function () {
      co.stdout.write('open'+cnt)
    })
    co.on('end.remote.stdout', function () {
      co.stdout.write('end'+cnt)
    })
  })
  it('can buffer data if stderr remote goes offline', function (done) {
    var data = '';
    var cnt = 0;
    var co = new Connector();
    co.on('error', function (){ /* void */ })
    co.enable(null, 'tcp://127.0.0.1:8157')
    var server = net.createServer((c) => {
      c.on('data', function (d) {
        data+=d.toString();
      })
      c.end();
      if (cnt>2) {
        server.close(function () {
          data.should.eql('open1end2open3');
          co.destroy();
          done();
        });
      }
      cnt++;
    }).listen(8157, '127.0.0.1')
    co.on('open.remote.stderr', function () {
      co.stderr.write('open'+cnt)
    })
    co.on('end.remote.stderr', function () {
      co.stderr.write('end'+cnt)
    })
  })
  it.skip('can write stdout to a file')
  it.skip('can write stderr to a file')


  after(function (done) {
    // clean up debug stream for next test scripts
    var stream = require('../lib/debug.js').stream;
    var tout;
    var onData = function (d) {
      clearTimeout(tout);
      tout = setTimeout(function () {
        stream.removeListener('data', onData);
        done();
      }, 250);
      process.stdout.write(d)
    };
    stream.on('data', onData)
    onData('');
    stream.resume();
  })
})
