var fs = require('fs'),
    net = require('net'),
    filename = process.argv[2],
    port = process.argv[3];

console.log("File: " + filename + " on port " + port);

var server = net.createConnection(port);

var rs = fs.createReadStream(filename);
rs.on('data', function (chunk) {
  console.log('data');
  server.write(chunk);
});
rs.on('end', function () {
  console.log('finish');
  server.end();
})
