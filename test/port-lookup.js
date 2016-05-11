require('should')

var miss        = require('mississippi')
var pkg         = require('../package.json')
var stream      = require('../lib/debug.js').stream
var debug       = require('../lib/debug.js')(pkg.name);
var portLookup  = require('../lib/port-lookup.js')
var net         = require('net')

describe('port-lookup', function () {
  it('waits for a port to open', function (done) {
    var opened = 0;
    portLookup(5846, function () {
      opened++;
    })
    setTimeout(function () {
      var server = net.createServer((c) => {
        c.end();
        server.close(function () {
          opened.should.eql(1)
          done();
        });
      });
      server.listen(5846)
    }, 500)
  })
  it('waits only once for a port to open', function (done) {
    var opened = 0;
    portLookup(5846, function () {
      opened++;
    })
    var openServer = function (then) {
      var server = net.createServer((c) => {
        c.end();
        server.close();
      }).on('listening', function () {
        setTimeout(then, 750);
      })
      server.listen(5846)
    }
    openServer(function () {
      setTimeout(function () {
        openServer(function () {
          setTimeout(function () {
            opened.should.eql(1)
            done();
          }, 100)
        })
      }, 100)
    })
  })
})
