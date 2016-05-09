
function AtMost (nTimes, withinThisDuration) {

  var that = this;

  this.events = [];

  this.eventOccured = function () {
    this.events.push(new Date().getTime())
    this.events.length>nTimes && this.events.shift();
  }

  this.hasExceeded = function () {
    if(!this.events.length) return false;
    var first = this.events[0];
    var last = this.events[this.events.length-1];
    return nTimes===this.events.length && last-first<=withinThisDuration;
  }

  this.howLongBeforeRetry = function () {
    var last = this.events[this.events.length-1];
    var diff = withinThisDuration-(new Date().getTime()-last);
    return diff<0 ? 0 : diff;
  }
}

module.exports = AtMost;
