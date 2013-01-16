var fs = require('fs'),
    net = require('net'),
    mysql = require('mysql'),
    selConn,
    Viewer,   // 網頁客戶端 Class
    Sender,   // 視訊來源 Class
    Mediator, // 協調器 Class
    mediator; // 協調器 Instance

sqlConn = mysql.createConnection({
  user: 'cga',
  password: '361520@orz'
});

/**
 * 協調器
 * @class mediator
 */

Mediator = function () {
  var senders = [],
      viewers = [];

  /**
   * 網頁客戶端記錄器
   * @method viewer_recorder
   * @param {Node Requser} req
   * @param {Node Response} res
   */

  this.viewer_recorder = function (req, res) {
    var viewer,
        viewer_id,
        check = false;

    while (!check) {
      viewer_id = Math.floor( Math.random() * 100000 ) + ''; // toString
      if ( this.get_viewer(viewer_id) === false ) {
        check = true;
        req.session.viewer_id = viewer_id;
      }
    }

    viewer = new Viewer(res, viewer_id);
    viewers.push(viewer);
  }

  /**
   * 監聽視訊來源
   * @method viewer_listen
   * @param {Node Request} req
   * @param {Node Response} res
   */

  this.viewer_listen = function (req, res) {
    var viewer;
    
    if (!req.session.viewer_id) {
      // 新網頁客戶端
      this.viewer_recorder(req, res);
    } else {
      // 更新 Response 物件
      viewer = this.get_viewer(req.session.viewer_id);
      viewer.update_res(res);
    }
  }

  /**
   * 取得 viewer
   * @method get_viewer
   * @param {String} viewer_id
   */

  this.get_viewer = function (viewer_id) {
    var i;

    for (i in viewers) {
      if (viewers[i].viewer_id === viewer_id){
        return viewers[i];
      }
    }
    return false;
  }

  /**
   * 建立 Sender 通道
   * @method create_sender
   * @param {String} token
   * @param {String} name
   * @param {Node Response} res
   */

  this.create_sender = function (token, name, res) {
    var options = {};

    options.department_id = 0;
    options.department = '未指定';

    // Check token
    sqlConn.query("SELECT `id` FROM `token` WHERE `token` = ? AND `expired` >= NOW()", token, function (err, rows, field) {
      if (err) throw err;
      if (rows.length > 0) {
        options.id = rows[0].id;
        // Get Department id/name
        sqlConn.query("SELECT `dep_id`, `name` FROM `department` WHERE `dep_id` = (SELECT `dep_id` FROM `token` WHERE `token` = ?)", token, function (err, rows, field) {
          if (err) throw err;
          if (rows.length > 0) {
            options.department = rows[0].name;
            options.department_id = rows[0].dep_id;
          }
          // make instance
          options.token = token;
          options.name = name || '未命名事件';
          sender = new Sender(options);
          senders.push(sender);
          res.json({
            statusText: 'wait',
            port: sender.port
          });
        });
      } else {
        return false;
      }
    });
  }

  /**
   * 檢查 Port 佔用狀態
   * @method check_port
   * @param {Integer} port
   * @return Boolean
   */

  this.check_port = function (port) {
    var i;
    for (i in senders) {
      if (senders[i].port === port)
        return true;
    }
    return false;
  }
}

mediator = new Mediator();

/**
 * 網頁客戶端物件
 * @class Viewer
 * @param {Node Response} res
 * @param {String} viewer_id - 網頁客戶端 id
 */

Viewer = function (res, viewer_id) {
  var watching = [],
      viewer;
  
  /**
   * @property res
   * @type Node Response
   */

  this.res = res;

  /**
   * @property viewer_id
   * @type String
   */

  this.viewer_id = viewer_id;
  
  /**
   * 新增觀看中影片
   * @method add_watch
   * @param {String} sender_id
   */

  this.add_watch = function (sender_id) {
    var check = false,
        i;

    for (i in watching) {
      if (sender_id === watching[i]){
        check = true;
        break;
      }
    }
    
    if (!check) {
      watching.push(sender_id);
      return true;
    } else {
      return false;
    }
  }

  /**
   * 更新 Response 物件
   * @method update_res
   * @param {Node Response} res
   */

  this.update_res = function (res) {
    this.res = res;
  }

  /**
   * 自動更新 Request
   * @method interval
   * @private
   */

  function interval () {
    if (viewer.res !== 'sent') {
      viewer.res.json({
        statusText: 'timeout'
      });
      viewer.res = 'sent';
    }
  }

  // 30 sec timeout
  setInterval(interval, 3000);
  viewer = this;
}

/**
 * @method notice
 * @param {Object} senders - 在線來源清單
 */

Viewer.prototype.notice = function (senders) {
  this.res.json(senders);
}

Sender = function (options) {
  /**
   * 佔用 Port 檢查用變數
   * @property check_port
   * @type Boolean
   * @private
   */

  var check_port = true,

  /**
   * Sender's this
   * @property sender
   * @type Sender Object
   * @private
   */

      sender;

  /**
   * 轉播機器編號
   * @property cam_id
   * @type Integer
   */

  this.cam_id = options.id;

  /**
   * 轉播機器通行碼
   * @property token
   * @type String
   */

  this.token = options.token;

  /**
   * 轉播機器單位
   * @property department
   * @type String
   * @defalut 未指定
   */

  this.department = options.department;

  /**
   * 轉播機器單位編號
   * @property department_id
   * @type Integer
   * @default 0
   */

  this.department_id = options.department_id;

  /**
   * 轉播事件名稱
   * @property name
   * @type String
   * @default 未命名事件
   */

  this.name = options.name;
  
  while (check_port) {
    var port = Math.floor( Math.random() * 20 ) + 5000;
    check_port = mediator.check_port(port);
  }
  
  /**
   * Stream Port
   * @property port
   * @type Integer
   */

  this.port = port;

  /**
   * Stream 狀態
   * @property streaming
   * @type Boolean
   * @default false
   */

  this.streaming = false;

  /**
   * 串流內容
   * @property data
   * @type Array
   */

  this.data = [];

  // 建立監聽器
  net.createServer( function (conn) {

    // Stream Start
    conn.on('connect', function () {

    });

    // Streaming
    conn.on('data', function (chunk) {
      // 影像來源行為
      if (chunk === 'stream') {
        conn.send('ok');
        sender.streaming = true;
      } else {
        sender.data.push(chunk);
      }
    });

    // Stream Close
    conn.on('close', function () {
      sender.streaming = false;
    });

  }).listen(port);

  sender = this;
}

function conn_viewer_listen (req, res) {
  mediator.viewer_listen(req, res);
}

function conn_sender (req, res) {
  var name = req.params.token,
      token = req.params.name;
  mediator.create_sender(token, name, res);
}

exports.viewer_listen = conn_viewer_listen;
exports.create_sender = conn_sender;
