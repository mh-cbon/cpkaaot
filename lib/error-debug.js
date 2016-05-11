var pkg           = require('../package.json')
var debug         = require('./debug.js')(pkg.name);
var debugStream   = require('./debug.js').stream;

module.exports = function (s, name) {
  s.on('error', function (err) {
    var t = s===debugStream ? console.error : debug;
    t(name + '.error=%j', err)
  })
}
