require('should')

var AtMost = require('../lib/at-most.js')

describe('at-most', function () {
  it('records events', function () {
    var most = new AtMost(5, 1500);
    most.events.length.should.eql(0)
    most.eventOccured();
    most.eventOccured();
    most.events.length.should.eql(2)
  })
  it('does not record more events than the limit', function () {
    var most = new AtMost(2, 1500);
    most.eventOccured();
    most.eventOccured();
    most.eventOccured();
    most.events.length.should.eql(2)
  })
  it('does not exceed when conditions are not met', function (done) {
    var most = new AtMost(3, 10);
    most.hasExceeded().should.eql(false);
    most.eventOccured();
    most.hasExceeded().should.eql(false);
    most.eventOccured();
    most.hasExceeded().should.eql(false);
    setTimeout(function () {
      most.eventOccured();
      most.hasExceeded().should.eql(false);
      done();
    }, 20)
  })
  it('exceeds when conditions are met', function () {
    var most = new AtMost(3, 10);
    most.hasExceeded().should.eql(false);
    most.eventOccured();
    most.hasExceeded().should.eql(false);
    most.eventOccured();
    most.hasExceeded().should.eql(false);
    most.eventOccured();
    most.hasExceeded().should.eql(true);
  })
})
