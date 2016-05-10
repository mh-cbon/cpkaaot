var pkg           = require('../package.json')
var debug         = require('./debug.js')(pkg.name);

var spawn         = require('child_process').spawn;
var util          = require('util');
var EventEmitter  = require('events');

function KeepAlive (bin, args, opts) {

  var that = this;
  var keepAlive = true;
  var child;

  this.start = function () {
    child = spawn(bin, args, opts);
    that.emit('start', child)
    child.on('close', function () {
      that.emit('close', child)
      if (keepAlive) process.nextTick(that.start.bind(that))
    })
  }

  this.leftForDead = function () {
    this.enableKeepAlive(false);
  }
  this.keepAlive = function () {
    this.enableKeepAlive(true);
  }
  this.enableKeepAlive = function (yesNoMaybe) {
    keepAlive = !!yesNoMaybe;
    if(!yesNoMaybe) this.events = [];
  }
}

util.inherits(KeepAlive, EventEmitter);

module.exports = KeepAlive;
