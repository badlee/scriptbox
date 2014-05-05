sys = require("util");
var 
    path = require('path'),
    fs = require('fs');

settings = require(path.resolve(__dirname,"settings.json"));

var express = require("express"),
	caminte = require('caminte'),
    Schema = caminte.Schema,
    db = {
         driver     :  settings.dbType || "memory",
         host       : settings.dbHost || "",
         port       : settings.dbPort || "",
         username   : settings.dbUser || "",
         password   : settings.dbPwd || "",
         database   : settings.dbPath ?  
            ( String(settings.dbPath).search(/^app:\//i) === 0 ?
              path.resolve.apply(path,['/'].concat(String(settings.dbPath).replace("app:/",__dirname).split("/").slice(1))) : 
              settings.dbPath
            ) :  "",
         pool       : settings.dbPool || false // optional for use pool directly 
    },
    dbProd = {
         driver     :  settings.dbProdType || "memory",
         host       : settings.dbProdHost || "",
         port       : settings.dbProdPort || "",
         username   : settings.dbProdUser || "",
         password   : settings.dbProdPwd || "",
         database   : settings.dbProdPath ?  
            ( String(settings.dbProdPath).search(/^app:\//i) === 0 ?
              path.resolve.apply(path,['/'].concat(String(settings.dbProdPath).replace("app:/",__dirname).split("/").slice(1))) : 
              settings.dbProdPath
            ) :  "",
         pool       : settings.dbProdPool || false // optional for use pool directly 
    };
    schema = new Schema(db.driver, db);
    schemaProd = new Schema(dbProd.driver, dbProd);

__DIR = __dirname;
swig = require('swig');
swig.setFilter('inArray', function(arr, key){
  return (arr && arr.indexOf ? (arr.indexOf(key) != -1) : false);
});

conf = {
  host : settings.bearerHost || '127.0.01',
	port : settings.bearerPort || 14001,
	http_port : settings.httpPort || 14014,
	id : settings.smsboxId || "LoveIsMyReligion"
};
/* load models */
Models = {};
fs.readdirSync(path.join(__dirname,"models")).forEach(function(route){
	require(path.join(__dirname,"models",route))(schema,schemaProd);
});    


var server =  express();
  server.set('view cache', false);
  //server.locals.cache = 'memory';
  // To disable Swig's cache, do the following:
  swig.setDefaults({ cache: false });
  server.engine('html', swig.renderFile);
  server.set('views', __dirname + '/views');
  server.set('view engine', 'html');
  
  server.use(require("morgan")(process.env.NODE_ENV || 'dev'));
  server.use(require('cookie-parser')());
  server.use(require('body-parser')());
  server.use(require('method-override')());
  server.use(require('express-session')({ secret: 'OshiminLabs' }));
  server.use(require('static-favicon')(__dirname + '/public/favicon.ico'));
  //server.use(server.router);
  

/* add route loader */
var loadroute = function(dir,module){
	var app;
	module = module || "";
	if(module)
		app = express.Router(); 
	fs.readdirSync(dir).forEach(function(route){
		var file = path.join(dir,route);
		if(fs.statSync(file).isDirectory())
			return loadroute(file,path.join(module || "/",route)); 
		require(file)(app || server, module || "/");
		if(module)
			server.use(module,app);			
	});
}

/* add public route */
loadroute(path.join(__dirname,"routes"));

//The 404 Route (ALWAYS Keep this as the last route)
server.get('*', function(req, res){
	res.status(404);
	return res.render("page-error",{error:{ code:404, message:req.url+" Not found"}});	
});

server.use(function errorHandler(err, req, res, next) {
  res.status(500);
  res.render('page-error', { error: {code : 500, stack : "<pre>"+err.stack+"</pre>", message : err.message }});
})



server.listen(conf.http_port || 1337);
