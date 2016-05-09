console.log('test_bin started');

process.on('exit', function () {
  console.log('test_bin ended');
})

process.stdin.on('data', function (d) {
  if (d.toString()==="exit\n") {
    process.exit(0)
  }
  process.stderr.write(d.toString())
})
