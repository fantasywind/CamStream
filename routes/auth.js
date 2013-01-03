
/*
 * Authentication.
 */
var mysql = require('mysql'),
	crypto = require('crypto'),
	randomstring = require("randomstring-extended");
var sqlConn = mysql.createConnection({
	host: 'localhost',
	user: 'cga',
	password: '361520@orz',
	database: 'cga_cam_stream'
});
var hashSalt = 'aEh%ew3#@as16';
var dep = {0: {name: '未指定', master: null}};

try {
	sqlConn.connect();
} catch (e) {
	console.dir(e);
}

/* Cache Department Data */
try {
	sqlConn.query("SELECT * FROM `department`", function (err, rows, fields) {
		if (err) throw err;
		for (var i in rows) {
			var tmp = {};
			tmp.name = rows[i].name;
			tmp.master = rows[i].master_id;
			dep[rows[i].dep_id] = tmp;
		}
		console.log('Cache Department Code:');
		console.dir(dep);
	});
} catch (e) {
	console.dir(e);
}

function getTokens(req, res){
	try {
		sqlConn.query("SELECT * FROM `user`", function (err, rows, fields){
			var users = {};
			for (var i in rows){
				users[rows[i].id] = rows[i].realname;  
			}
			sqlConn.query("SELECT `device`, `expired`, `maker_id`, `pass_code`, `dep_id` FROM `token` ORDER BY `expired` DESC", function (err, rows, fields){
				if (err) throw err;
				var tokens = [];
				for (var i in rows){
					var tmp = {};
					tmp.maker = users[rows[i].maker_id];
					tmp.dep_id = rows[i].dep_id;
					tmp.dep = dep[tmp.dep_id];
					tmp.pass_code = rows[i].pass_code;
					tmp.expired = rows[i].expired;
					tmp.device = rows[i].device;
					tokens.push(tmp);  
				}
				res.setHeader('Content-Type', 'application/json');
				res.setHeader('Content-Encoding', 'utf-8');
				res.charset = 'utf-8';
				res.json(tokens);
			});
		});
	} catch (e) {
		return {status: 'error', message: e};
	}
}

function deleteToken(req, res){
	var passCode = req.params.pc || 0;
	console.log("passCoed: " + passCode);
	if (!passCode){
		res.writeHead(401);
		res.end();  
	} else {
		sqlConn.query("DELETE FROM `token` WHERE `pass_code` = ?", passCode, function (err, rows, field){
			if (err) throw err;
			res.json({
				status: 'deleted'
			});
		});
	}
}

/* Auto Unset Timeout Token */
function autoUnsetToken(code){
    var timeout = function(){
        sqlConn.query("DELETE FROM `token` WHERE `expired` is null AND `pass_code` = ?", code, function (err, rows, field) {
            console.log('Auto unset: ' + code);
            return; 
        });
    };
    setTimeout(timeout, 15 * 60000);
}

/* Add New Token */
function codeUnique(code, req, res){
	sqlConn.query("SELECT COUNT(*) FROM `token` WHERE `pass_code` = ?", code, function (err, rows, field){
		if (rows[0]['COUNT(*)'] == 0){
			var token = crypto.createHash('md5').update(code + hashSalt).digest('hex');
			var sql = "INSERT INTO `token` (`token`, `create_time`, `maker_id`, `pass_code`) VALUES ('";
				sql += token + "', NOW(), " + req.session.uid + ", " + code + ")";
			sqlConn.query(sql, function (err, rows, field){

			    // Auto Unset
			    autoUnsetToken(code);

			    if (err) throw err;
			    var result = {
			    	status: 'success',
			    	pass_code: code,
			    	device: ''
			    };
			    res.json(result);
			});
		} else {
			codeUnique(makeCode(), req, res);
		}
	});
}

function makeCode(){
	return Math.floor(Math.random() * 1000000 + 1);  
}

function write_device_data (token, req, res) {
	var device = req.params.device,
	    pass_code = req.params.pc;
	sqlConn.query("UPDATE `token` SET `expired` = DATE_ADD(now(), INTERVAL 30 DAY), `device` = ? WHERE `pass_code` = ?", [device, pass_code], function (err, rows, field) {
		if (err) throw err;
		var result = {};
		result.status = 'Success';
		result.token = token;
		res.json(result);
	});
}

function add_device(req, res){
	var pass_code = req.params.pc;
	try {
		sqlConn.query("SELECT `token` FROM `token` WHERE `expired` is null AND `pass_code` = ?", pass_code, function (err, rows, field) {
			if (err) throw err;
			var result = {};
			if (rows.length){
				var token = rows[0].token;
				write_device_data(token, req, res);
			} else {
				result.status = 'Uncatched Pass';
				res.json(result);
			}
});
	} catch (e) {
		console.dir(e);
	}
}

/* Module Public Functions */

exports.newDevice = function(req, res){
	add_device(req, res);
}

exports.deleteToken = function(req, res){
	if (req.session.role == 'admin'){
		deleteToken(req, res);
	} else {
		res.writeHead(401);
		res.end();  
	}
}

exports.newToken = function(req, res){
	if (req.session.role != 'admin'){
		res.writeHead(401);
		res.end();
	} else {
		codeUnique(makeCode(), req, res);
	}
}

exports.login = function(req, res){
	if (req.session.role)
		res.redirect('/');
	if (req.body.username && req.body.password){
		sqlConn.query("SELECT * FROM `user` WHERE `username` = ?", req.body.username, function (err, rows, field) {
			var result = rows[0];
			if (result){
				var hashed = crypto.createHash('md5').update(req.body.password).digest('hex');
				var plusSalt = crypto.createHash('md5').update(hashed + result.salt).digest('hex');
				if (plusSalt == result.password){
					req.session.role = result.role;
					req.session.uid = result.id;
					res.redirect('/');
				} else
				    res.render('login', {statusText: 'PasswordWrong'});
			} else
			    res.render('login', {statusText: 'UsernameUnknown'});
		});
	} else
		render('login', {statusText: 'Login'});
}

exports.logout = function(req, res){
	delete req.session.role
	res.redirect('/');
}

exports.get = function(req, res){
	if (req.session.role == 'admin'){
		var result = getTokens(req, res);
	} else {
		var result = {
			status: 'unavailable',
			test: 'Yoo'
		};
		res.setHeader('Content-Type', 'application/json');
		res.end(JSON.stringify(result));
	}
};
