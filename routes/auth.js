
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

try {
	sqlConn.connect();
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
			sqlConn.query("SELECT `device`, `expired`, `maker_id`, `pass_code` FROM `token` ORDER BY `expired` DESC", function (err, rows, fields){
				if (err) throw err;
				var tokens = [];
				for (var i in rows){
					var tmp = {};
					tmp.maker = users[rows[i].maker_id];
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
					

function codeUnique(code, req, res){
	sqlConn.query("SELECT COUNT(*) FROM `token` WHERE `pass_code` = ?", code, function (err, rows, field){
		if (rows[0]['COUNT(*)'] == 0){
			var token = crypto.createHash('md5').update(code + hashSalt).digest('hex');
			var sql = "INSERT INTO `token` (`token`, `create_time`, `expired`, `maker_id`, `pass_code`) VALUES ('";
				sql += token + "', NOW(), DATE_ADD(NOW(), INTERVAL + 14 DAY), " + req.session.uid + ", " + code + ")";
			sqlConn.query(sql, function (err, rows, field){
				if (err) throw err;
				var today = new Date().getTime() + (14 * 60 * 60 * 24 * 1000);
				var expired = new Date(today);
				var result = {
					status: 'success',
					pass_code: code,
					today: today,
					expired: expired,
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
					console.dir(result)
					req.session.role = result.role;
					req.session.uid = result.id;
					console.dir(req.session)
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
