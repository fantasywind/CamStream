
/*
 * GET home page.
 */

exports.index = function(req, res){
	if (!req.session.role){
		res.render('login', {statusText: 'Login'});
	} else {
		res.render('index', { title: 'Cga Cam Stream System' });
	}
};
