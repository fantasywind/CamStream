var fs = require('fs'),
    net = require('net'),
    filename = process.argv[2],
    port = process.argv[3];

console.log("File: " + filename + " on port " + port);

var server = net.createConnection(port);

var pool = [];

var rs = fs.createReadStream(filename);
rs.on('data', function (chunk) {
  pool.push(chunk);
});
rs.on('end', function () {
});

var i = 0, interval;

function sender(){
  if (pool[i]){
    server.write(pool[i]);
    i++;
    console.log('sent');
  } else {
    server.end();
    clearInterval(interval);
  }
}

interval = setInterval(sender, 1000);
