
/*
 * Authentication.
 */


exports.get = function(req, res){


	var result = {
		status: 'unavailable',
		test: 'Yoo'
	};

	res.setHeader('Content-Type', 'application/json');
	res.end(JSON.stringify(result));
};
