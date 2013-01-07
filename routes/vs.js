var net = require("net"),
    fs = require("fs"),
    mysql = require('mysql'),
    crypto = require('crypto'),
    PORT = 36152,
    PATH = "./videos/",
    receiver,
    ports = [],
    vs, stream;

var sqlConn = mysql.createConnection({
  host: 'localhost',
  user: 'cga',
  password: '361520@orz',
  database: 'cga_cam_stream'
});

try {
  sqlConn.connect();
} catch (e) {
  console.dir(e);
}

//  Receiver

receiver = function (token_id, name){
  var random,
      exists,
      filename,
      finalname,
      vs,
      fstream;

  this.token_id = token_id;
  name = name || "未命名影片";
  this.name = name;
  
  //  Get Port
  while (!this.port) {
    random = Math.floor( Math.random() * 20 ) + 4000;
    if (!ports[random]) {
      this.port = random;
      ports[random] = true;
    }
  }

  //  Get Random Hash Filename
  while (!filename) {
    random = Math.floor( Math.random() * 10000 ) + this.port;
    random = crypto.createHash('md5').update(random.toString()).digest('hex');
    finalname = random + '.mp4';
    random += '.tmp';
    console.log(random);
    exists = fs.existsSync(PATH + random);
    if (!exists)
      filename = random;
  }

  console.log("\033[034mReceiver: " + filename + " on port " + this.port + "\033[039m");

  //  Create Video Stream Server
  vs = net.createServer( function (conn) {
    conn.on("connect", function(r) {
      this.status = "Handshake";
      fstream = fs.createWriteStream(PATH + filename);
      console.log("\033[033m - Get connection on " + this.port + "\033[039m");
    });
    
    conn.on("data", function(chunk) {
      this.status = "streaming";
      fstream.write(chunk);
    });
    
    conn.on("end", function() {
      this.status = "close";
      console.log("\033[034Close Receiver: " + filename + " on port " + this.port + "\033[039m");
      fstream.end();
      fs.renameSync(PATH + filename, PATH + fianlname);
      sqlConn.query("INSERT INTO `videos` (`token_id`, `filename`, `name`, `upload_date`) VALUES ('" + token_id + "', '" + finalname + "', '" + name + "', NOW())", function (err, rows, field) {
        if (err) throw err;
      });
      delete ports[this.port];
      vs.close();
    });
  }).listen(this.port);

  this.status = "listen";
};

exports.new_stream = function (req, res) {
  var token_id = req.session.token_id,
      name = req.params.name || '未命名影片';

  if (token_id) {
    try {
      var server = new receiver(token_id, name);
      res.json({
        status: 'success',
        port: server.port
      });
    } catch (e) {
      res.json({
        status: 'failed',
        msg: e
      });
    }
  }
}

exports.get = function (req, res) {
  var id = parseInt(req.params.id, 10),
      name,
      video;

  sqlConn.query("SELECT `filename` FROM `videos` WHERE `id` = ?", id, function (err, rows, field){
    if (rows.length){
      name = rows[0].filename;
      video = fs.createReadStream('./videos/' + name);

      video.on('data', function (data) {
        res.write(data);
      });
      
      video.on('close', function () {
        res.end();
      });
    } else {
      res.writeHead(404);
      res.end();
    }
  });
}
