console.error('test_bin started');

process.on('exit', function () {
  console.error('test_bin ended');
})

var server = http.createServer(function (req) {
  console.log('got a request')
  req.end("got it")
})
server.listen(8080);
