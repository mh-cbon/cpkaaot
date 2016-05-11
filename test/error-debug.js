require('should')

var miss        = require('mississippi')
var pkg         = require('../package.json')
var stream      = require('../lib/debug.js').stream
var debug       = require('../lib/debug.js')(pkg.name);
var errorDebug  = require('../lib/error-debug.js')

describe('error-debug', function () {
  it('emits error on debug stream', function (done) {
    var s = miss.through()
    errorDebug(s, 's')
    stream.once('data', function (d) {
      d = d.toString()
      d = d.replace(/[^a-z0-9\.\[ =]/ig, '')
      d = d.replace(/\[[0-9]+m/ig, '')
      d = d.replace(/[0-9]+ms$/, '')
      d = d.replace(/^\s*|\s*$/g, '')
      d.should.eql('cpkaaot s.error=something')
      done();
    })
    s.emit('error', 'something')
  })
  it('must not emit debug-stream errors on debug-stream', function (done) {
    errorDebug(stream, 'stream');
    var gotData= '';
    stream.once('data', function (d) {
      gotData += d.toString()
    })
    stream.emit('error', 'something')
    setTimeout(function () {
      gotData.should.eql('')
      done();
    }, 20)
  })
})
