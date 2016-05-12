require('should')

var miss    = require('mississippi')
var spawn   = require('child_process').spawn;
var exec    = require('child_process').exec;
var net     = require('net');

describe('cpkaaot', function () {
  it('restarts the process', function (done) {
    var child = spawn(process.argv[0], [
        'bin.js',
        '--stdout=-',
        '--stderr=-',
        '--', 'utils/writer.js'
      ], {env:{DEBUG:'*'}}
    );
    // child.stdout.pipe(process.stderr);
    // child.stderr.pipe(process.stderr);
    var stderr = '';
    child.stderr.on('data', function (d) {
      stderr += d.toString();
    });
    setTimeout(function () {
      child.kill('SIGINT');
      setTimeout(function () {
        child.kill('SIGTERM');
      }, 250)
    }, 500)
    child.on('close', function () {
      stderr.match(/child\.event start/g).length.should.eql(2)
      stderr.match(/child\.send SIGINT/g).length.should.eql(1)
      stderr.match(/child\.send SIGTERM/g).length.should.eql(1)
      done();
    })
  })
  it('does not restart the process more than 3 times', function (done) {
    var child = spawn(process.argv[0], ['bin.js', '--stdout=-', '--stderr=-', '--', 'utils/writer.js'], {env:{DEBUG:'*'}});
    // child.stdout.pipe(process.stderr);
    // child.stderr.pipe(process.stderr);
    var stderr = '';
    child.stderr.on('data', function (d) {
      stderr += d.toString();
    });
    setTimeout(function () {
      child.kill('SIGINT');
      setTimeout(function () {
        child.kill('SIGINT');
        setTimeout(function () {
          child.kill('SIGINT');
          setTimeout(function () {
            child.kill('SIGINT');
          }, 250)
        }, 250)
      }, 250)
    }, 500)
    child.on('close', function () {
      stderr.match(/child\.event start/g).length.should.eql(3)
      stderr.match(/re spawned too often/g).length.should.eql(1)
      done();
    })
  })
  it('does not drop log if the logger goes offline/online', function (done) {
    var stderr = {data:''};
    var stdout = {data:''};
    var makeServer = function (port, str) {
      var server = net.createServer((c) => {
        c.on('data', function (d) {
          str.data += d.toString();
        })
      });
      server.listen(port, '127.0.0.1');
      return server;
    }
    var stdoutServer = makeServer(5978, stdout)
    var stderrServer = makeServer(5979, stderr)

    var child = spawn(process.argv[0], [
      'bin.js',
      '--stdout=tcp://127.0.0.1:5978',
      '--stderr=tcp://127.0.0.1:5979',
      '--', 'utils/writer.js']
      ,{stdio:'pipe', env:{DEBUG:''}}
    );
    child.stdout.pipe(process.stderr);
    child.stderr.pipe(process.stderr);
    child.on('close', function () {
      var l = stdout.data.split('\n');
      var k = stderr.data.split('\n');
      l.length.should.eql(parseInt(l[l.length-2].match(/[0-9]+$/)[0])+2)
      k.length.should.eql(parseInt(k[k.length-2].match(/[0-9]+$/)[0])+2)
      l[l.length-2].should.eql('stdout ' + (l.length-2))
      k[k.length-2].should.eql('stderr ' + (k.length-2))
      done();
    })
    setTimeout(function () {
      stdoutServer.close();
      stderrServer.close();
    }, 500)
    setTimeout(function () {
      stdoutServer = makeServer(5978, stdout)
      stderrServer = makeServer(5979, stderr)
    }, 600)
    setTimeout(function () {
      stdoutServer.close();
      stderrServer.close();
      child.kill('SIGTERM');
    }, 1000)

    this.timeout(5000)
  })

})
