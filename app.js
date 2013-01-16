/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , auth = require('./routes/auth')
  , user = require('./routes/user')
  , vs = require('./routes/vs')
  , vs2 = require('./routes/vs2')
  , test = require('./routes/test')
  , http = require('http')
  , path = require('path')
var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 3615);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.cookieParser('cga361520@orz'));
  app.use(express.session());
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.get('/', routes.index);
app.post('/login', auth.login);
app.post('/device/login', auth.device_login);
app.post('/auth/:pc/:device', auth.newDevice);
app.del('/auth/:pc', auth.deleteToken);
app.get('/logout', auth.logout);
app.get('/auth/listen/:pc', auth.listen);
app.get('/auth/new', auth.newToken);
app.get('/auth/check', auth.check);
app.get('/auth', auth.get);
app.get('/users', user.list);
app.get('/transfer/:port', vs.transfer);
app.post('/new/:name', vs.new_stream);
app.get('/listen', vs.listen_stream);
app.get('/down/:id', vs.down_stream);
app.get('/v/:id', vs.get);
app.get('/test', test.main);
app.get('/viewer/listen', vs2.viewer_listen);
app.post('/sender/:token/:name', vs2.create_sender);

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
