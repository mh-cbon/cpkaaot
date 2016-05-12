require('should')

var miss        = require('mississippi')
var pkg         = require('../package.json')
var stream      = require('../lib/debug.js').stream
var debug       = require('../lib/debug.js')(pkg.name);
var PortLookup  = require('../lib/port-lookup.js')
var net         = require('net')

describe('port-lookup', function () {
  it('waits for a port to open', function (done) {
    var found = 0;
    var lookup = new PortLookup(5846);
    lookup.once('found', function () {
      found++;
    })
    setTimeout(function () {
      var server = net.createServer((c) => {
        c.end();
        server.close(function () {
          found.should.eql(1)
          done();
        });
      });
      server.listen(5846)
    }, 500);
    lookup.startLookup();
  })
  it('waits only once for a port to open', function (done) {
    var found = 0;
    var opened = 0;
    var lookup = new PortLookup(5846);
    lookup.once('found', function () {
      found++;
    })
    var openServer = function (then) {
      var server = net.createServer((c) => {
        c.end();
        server.close();
      }).on('listening', function () {
        opened++;
        setTimeout(then, 750)
      })
      server.listen(5846)
    }
    openServer(function () {
      setTimeout(function () {
        openServer(function () {
          setTimeout(function () {
            found.should.eql(1)
            opened.should.eql(2)
            done();
          }, 100)
        });
      }, 100)
    })
    lookup.startLookup();
  })
})
