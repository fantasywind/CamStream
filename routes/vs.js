var net = require("net"),
    fs = require("fs"),
    PORT = 36152,
    PATH = "./videos/123.3gp",
    vs, stream;

stream = fs.createWriteStream(PATH);

vs = net.createServer( function(conn) {

  conn.on("connect", function (resource) {
    console.log("New Connection.")
  });

  conn.on("data", function (data) {
    console.log('On data.');
    stream.write(data);
  });

  conn.on("end", function () {
    console.log("Video Stream Server is down");
    stream.end();
  });
}).listen(PORT);

console.log("Video Stream Server listening on port " + PORT);
