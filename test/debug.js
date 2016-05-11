require('should')

/*
!!!!!!!!!!!! DEBUG=cpkaaot env MUST be set.
otherwise this suite fails.
*/

var pkg    = require('../package.json')
var stream = require('../lib/debug.js').stream
var debug  = require('../lib/debug.js')(pkg.name);

describe('debug', function () {
  it('redirects debug message to the stream', function (done) {
    stream.once('data', function (d) {
      d = d.toString()
      d = d.replace(/[^a-z0-9\[ ]/ig, '')
      d = d.replace(/\[[0-9]+m/ig, '')
      d = d.replace(/[0-9]+ms$/, '')
      d = d.replace(/^\s*|\s*$/g, '')
      d.should.eql('cpkaaot something')
      done();
    })
    debug('something')
  })
  it('redirects formatted debug message to the stream', function (done) {
    stream.once('data', function (d) {
      d = d.toString()
      d = d.replace(/[^a-z0-9\[ ]/ig, '')
      d = d.replace(/\[[0-9]+m/ig, '')
      d = d.replace(/[0-9]+ms$/, '')
      d = d.replace(/^\s*|\s*$/g, '')
      d.should.eql('cpkaaot something')
      done();
    })
    debug('%s', 'something')
  })
})
