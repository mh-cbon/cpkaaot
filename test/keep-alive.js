require('should')

var miss        = require('mississippi')
var pkg         = require('../package.json')
var stream      = require('../lib/debug.js').stream
var debug       = require('../lib/debug.js')(pkg.name);
var KeepAlive   = require('../lib/keep-alive.js')

describe('keep-alive', function () {
  it('restarts the process when keepAlive is on', function (done) {
    var events = '';
    var cnt = 0;
    var ka = new KeepAlive('echo', ['some'])
    ka.on('start', function (child) {
      cnt++;
      events+='start'
      if (cnt>1) {
        ka.leftForDead();
        setTimeout(function () {
          events.should.eql('startclosestartclose');
          cnt.should.eql(2);
          done();
        }, 500)
      }
    })
    ka.on('close', function (child) {
      events+='close'
    })
    ka.start();
  })
  it('does not restart the process when leftForDead is on', function (done) {
    var events = '';
    var cnt = 0;
    var ka = new KeepAlive('echo', ['some'])
    ka.on('start', function (child) {
      ka.leftForDead();
      cnt++;
      events+='start'
      setTimeout(function () {
        events.should.eql('startclose');
        cnt.should.eql(1);
        done();
      }, 500)
    })
    ka.on('close', function (child) {
      events+='close'
    })
    ka.start();
  })
})
