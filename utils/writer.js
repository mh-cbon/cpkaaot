var i = 0;
setInterval(function () {
  console.log('stdout ' + i);
  console.error('stderr ' + i);
  i++
}, 10)
