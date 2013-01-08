var mysql = require('mysql'),
    sqlConn = mysql.createConnection({
      host: 'localhost',
      user: 'cga',
      password: '361520@orz',
      database: 'cga_cam_stream'
    });

exports.main = function (req, res){
  var devices;

  sqlConn.query("SELECT * FROM `token`", function (err, rows, field){
    devices = rows;

    res.render('test', {devices: devices});
  });

}
