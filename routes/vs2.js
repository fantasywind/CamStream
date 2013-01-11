var fs = require('fs'),
    net = require('net'),
    mysql = require('mysql'),
    selConn,
    Receiver, Sender, boardcaster;

sqlConn = mysql.createConnection({
  user: 'cga',
  password: '361520@orz'
});

boardcaster = {};
boardcaster.receiver = [];
boardcaster.sender = [];

Sender = function (token) {
  
}
