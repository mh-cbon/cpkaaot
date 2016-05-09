
var Logger = function (stdout, stderr) {
  // tbd
  this.connect = function (child) {
    child.stdout.pipe(process.stdout);
    child.stderr.pipe(process.stderr);
  }

  this.disconnect = function (child) {
    child.stdout.unpipe(process.stdout);
    child.stderr.unpipe(process.stderr);
  }
}

module.exports = Logger;
