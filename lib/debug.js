var debug = require('debug')
var util  = require('util')
var miss  = require('mississippi');
var stream = miss.through();
debug.log = function (m) {
  stream.write(util.format.apply(null, arguments) + '\n')
}
debug.stream = stream;

module.exports = debug;
