console.error('test_bin started');

process.on('exit', function () {
  console.error('test_bin ended');
})

var server = require('http').createServer(function (req, res) {
  console.log('got a request')
  if (req.url.match(/\/error/)) {
    res.end('sending error !')
    throw 'ERROOOR';
  } else {
    res.end("got it")
  }
})
server.listen(8081);
