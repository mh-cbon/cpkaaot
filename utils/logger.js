var net = require('net');
var server = net.createServer((c) => {
  c.pipe(process.stdout);
});
server.on('error', (err) => {
  throw err;
});
server.listen(8124);

var server = net.createServer((c) => {
  c.pipe(process.stderr);
});
server.on('error', (err) => {
  throw err;
});
server.listen(8125);
