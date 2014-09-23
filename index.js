sys = require("util");
var 
    path = require('path'),
    fs = require('fs');
    DEFAULT = {httpPort :13014,id : "OshiminSecret"};
var getDir = function (dbProdPath){
	var pwd = process.cwd();
	if(typeof __dirname != "undefined")
		pwd = __dirname;
		
	return String(dbProdPath).search(/^app:\/\//i) === 0 ? 
		path.resolve.apply(path,[path.sep].concat(String(dbProdPath).replace(/\//g,path.sep).replace("app:"+(path.sep),pwd).split(path.sep).slice(1)))
		: dbProdPath
}

settings = require(path.resolve(__dirname,"settings.json"));

var express = require("express"),
  //SessionStore = require('connect-session-file'),
	caminte = require('caminte'),
    Schema = caminte.Schema,
    db = {
         driver     :  settings.dbType || "memory",
         host       : settings.dbHost || "",
         port       : settings.dbPort || "",
         username   : settings.dbUser || "",
         password   : settings.dbPwd || "",
         database   : settings.dbPath ?  getDir(settings.dbPath) :  "",
         pool       : settings.dbPool || false // optional for use pool directly 
    },
    dbProd = {
         driver     :  settings.dbProdType || "memory",
         host       : settings.dbProdHost || "",
         port       : settings.dbProdPort || "",
         username   : settings.dbProdUser || "",
         password   : settings.dbProdPwd || "",
         database   : settings.dbProdPath ? getDir(settings.dbProdPath) :  "",
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
	http_port : settings.httpPort || DEFAULT.httpPort
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
  //server.disable( 'x-powered-by' );
  server.use(function (_, res, next) {
    /*set header */
    res.setHeader( 'Server', 'Awesome App' );
    res.setHeader( 'X-Author', 'BADINGA BADINGA ULRICH ARTHUR' );
    res.setHeader( 'X-Copy', '(c) Oshimin Labs 2014' );
    next();
  });
  server.use(require("morgan")(process.env.NODE_ENV || 'dev'));
  server.use(require('cookie-parser')(DEFAULT.id));
  server.use(require('body-parser')());
  server.use(require('method-override')());
  server.use(require('express-session')({
    secret: DEFAULT.id,
    /*store: new SessionStore({
      path: path.join(__DIR, "sessions"),
      prefix : "session-file-"
    })*/
  }));
  server.use(require('serve-favicon')(__dirname + '/public/favicon.ico'));
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
			return loadroute(file,path.join(module || "/",route).replace(path.sep,'/')); 
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

server.listen(conf.http_port || DEFAULT.httpPort,function(err){
  console.log("Server Listen "+(conf.http_port || DEFAULT.httpPort),"port.");
});