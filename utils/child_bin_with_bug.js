console.error('test_bin started');

process.on('exit', function () {
  console.error('test_bin ended');
})

var server = http.createServer(function (req/*, res*/) {
  console.log('got a request')
  req.end("got it") // no such req end.
})
server.listen(8080);
