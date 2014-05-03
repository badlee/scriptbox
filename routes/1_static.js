module.exports = function(server){
	server.use(require('express').static(require('path').resolve(__dirname,'..', 'public')));
}

