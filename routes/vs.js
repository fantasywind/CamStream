var net = require("net"),
    fs = require("fs"),
    mysql = require('mysql'),
    crypto = require('crypto'),
    PORT = 36152,
    PATH = "./videos/",
    receiver,
    Cam,
    cams = {},
    Client,
    clients = {},
    ports = [],
    stream = {},
    idToToken = {},
    portToFile = {},
    vs, stream, i;

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

//  Garbage Collection

function cleaner () {
  for (i in cams){
    if (cams[i].finish){
      delete cams[i];
    }
  }
  for (i in clients){
    if (clients[i].finish){
      delete clients[i];
    }
  }
}
setInterval(cleaner, 60000);

//  Client Connection Object - listen cams status

Client = function(req, res, serial){
  var timeout,
      results,
      sent = [],
      first = req.query.first;

  this.wait = function () {
    var cam_list = [];
    for (i in cams) {
      cam_list.push({
        alias: cams[i].alias,
        name: cams[i].name,
        id: cams[i].id
      })
    }
    res.json({
      status: 'wait',
      cams: cam_list
    });
    clients[serial].finish = true;
  };
  this.close_cam = function (id){
    if (!clients[serial].finish){
      clearTimeout(timeout);
      res.json({
        status: 'cam_close',
        cam_id: id
      });
      clients[serial].finish = true;
    }
  }
  this.new_cam = function (token, notified, id, name, alias) {
    notified[req.session.seid] = true;
    clearTimeout(timeout);
      res.json({
        status: 'new_cam',
        cams: [{
          alias: alias,
          name: name,
          id: id
        }]
      });
    clients[serial].finish = true;
  };
  this.finish = false;
  //  Check exists
  results = [];
  for (var i in cams){
    if (!cams[i].notified[req.session.seid] || first === 'true'){
      cams[i].notified[req.session.seid] = true;
      results.push({
        alias: cams[i].alias,
        name: cams[i].name,
        id: cams[i].id
      });
    }
  }
  if (results.length){
    res.json({
      status: 'new_cam',
      cams: results
    });
  } else {
    console.log('timeout');
    timeout = setTimeout(this.wait, 30000);
  }
}

//  Cam Connection Object

Cam = function(req, res, token, name){
  var timeout,
      alias,
      id,
      thisObj = this;
  
  this.notified = {};
  this.token = token;
  this.name = name;
  this.wait = function () {
    res.json({
      status: 'wait'
    });
    cams[token].finish = true;
  };
  this.success = function (port) {
    clearTimeout(timeout);
    res.json({
      status: 'success',
      port: port
    });
    cams[token].finish = true;
  };
  this.finish = false;
  timeout = setTimeout(this.wait, 3000);

  sqlConn.query("SELECT `alias`, `id` FROM `token` WHERE `token` = ?", token, function (err, rows, field){
    if (err) throw err;
    if (rows.length){
      thisObj.alias = rows[0].alias;
      thisObj.id = rows[0].id;
      idToToken[rows[0].id] = token;

      //  notify clients
      for (i in clients){
        clients[i].new_cam(token, thisObj.notified, thisObj.id, name, thisObj.alias);
      }
    }
  });

};

//  Receiver

Receiver = function (token_id, name, listener){
  var random,
      exists,
      filename,
      finalname,
      vs,
      fstream;

  this.token_id = token_id;
  name = name || "未命名影片";
  this.name = name;
  
  console.log('port: ' + this.port);

  //  Get Port
  while (!this.port) {
    random = Math.floor( Math.random() * 20 ) + 4000;
    if (!ports[random]) {
      this.port = random;
      ports[random] = true;
    }
  }
  
  console.log('port random:' + this.port)

  //  Get Random Hash Filename
  while (!filename) {
    random = Math.floor( Math.random() * 10000 ) + this.port;
    random = crypto.createHash('md5').update(random.toString()).digest('hex');
    finalname = random + '.mp4';
    random += '.tmp';
    exists = fs.existsSync(PATH + random);
    if (!exists)
      filename = random;
  }

  var listen_port = this.port;

  //  Create Video Stream Server
  vs = net.createServer( function (conn) {
    conn.on("connect", function(r) {
      this.status = "Handshake";
      fstream = fs.createWriteStream(PATH + filename);
      portToFile[listen_port] = PATH + filename;
      stream[listen_port] = [];

      //  Notify Listener
      listener.json({
        status: 'online',
        port: listen_port
      });
      
      console.log("\033[033m - Get connection on " + listen_port + "\033[039m");
    });
    
    conn.on("data", function (chunk) {
      this.status = "streaming";
      stream[listen_port].push(chunk);
      fstream.write(chunk);
    });
    
    conn.on("end", function () {
      this.status = "close";
      console.log("\033[034mClose Receiver: " + filename + " on port " + listen_port + "\033[039m");
      fstream.end();
      fs.renameSync(PATH + filename, PATH + finalname);
      sqlConn.query("INSERT INTO `videos` (`token_id`, `filename`, `name`) VALUES ('" + token_id + "', '" + finalname + "', '" + name + "')", function (err, rows, field) {
        if (err) throw err;
      });
      for (i in clients) {
        clients[i].close_cam(token_id);
      }
      delete ports[listen_port];
      vs.close();
    });

  }).listen(this.port);

  this.status = "listen";
};

exports.listen_stream = function (req, res){
  if (req.session.role){
    try {
      var test = true,
          random;
      console.dir(clients);
      while (test){
        random = Math.floor(Math.random() * 1000);
        if (!clients[random]){
          clients[random] = new Client(req, res, random);
          test = false;
        }
      }
    } catch (e) {
      res.json({
        status: 'fail',
        msg: e
      });
    }
  }
}

exports.transfer = function (req, res) {
  var port = req.params.port,
      finalname = portToFile[port].replace('.tmp', '.mp4'),
      read_interval,
      i = 0,
      totalSize;
    
    function reader(){
      totalSize = stream[port].length;
      if (totalSize > i){
        res.write(stream[port][i]);
        i += 1;
      } else if (!ports[port] && totalSize < i){
        clearInterval(read_interval);
        res.end();
        delete stream[port];
      }
    }

    read_interval = setInterval(reader, 250);
}

exports.down_stream = function (req, res) {
  var id = req.params.id,
      token = idToToken[id],
      server;

  if (token){
    server = new Receiver(id, cams[token].name, res);
    cams[token].success(server.port);
  } else {
    res.json({
      status: 'offline'
    });
  }
}

exports.new_stream = function (req, res) {
  var token_id = req.session.token_id,
      name = req.params.name || '未命名影片';

  if (token_id) {
    try {
      //var server = new receiver(token_id, name),
      cams[token_id] = new Cam(req, res, token_id, name);
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
