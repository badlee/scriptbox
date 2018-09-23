process.title = require("./package.json").name;
sys = require("util");
var 
    path = require('path'),
    memory = require("./memory"),
    fs = require('fs');
    DEFAULT = {httpPort :13014,id : "OshiminSecret"};
var getDir = function (dirPath){
	var pwd = process.cwd();
	if(typeof __dirname != "undefined")
		pwd = __dirname;
		
	return String(dirPath).search(/^app:\/\//i) === 0 ? 
		path.resolve.apply(path,[path.sep].concat(String(dirPath).replace(/\//g,path.sep).replace("app:"+(path.sep),pwd).split(path.sep).slice(1)))
		: dirPath
}

require("./settings");

var express = require("express"),
  pluginRouter = express.Router(),
  sessions = require('express-session'),
  CaminteStore = require('connect-caminte')(sessions),
	caminte = require('caminte'),
    Schema = caminte.Schema,
    db = {
         driver     :  settings.dbType || "memory",
         host       : settings.dbHost || "",
         port       : settings.dbPort || "",
         username   : settings.dbUser || "",
         password   : settings.dbPwd || "",
         database   : settings.dbPath ?  getDir(settings.dbPath) :  "",
         pool       : settings.dbPool || false, // optional for use pool directly 
         ssl        : settings.dbSSL || false // optional for use pool directly 
    },
    dbProd = {
         driver     :  settings.dbProdType || "memory",
         host       : settings.dbProdHost || "",
         port       : settings.dbProdPort || "",
         username   : settings.dbProdUser || "",
         password   : settings.dbProdPwd || "",
         database   : settings.dbProdPath ? getDir(settings.dbProdPath) :  "",
         pool       : settings.dbProdPool || false, // optional for use pool directly 
         ssl        : settings.dbProdSSL || false // optional for use pool directly 
    };
    schema = new Schema(db.driver, db);
    schemaProd = new Schema(dbProd.driver, dbProd);

__DIR = __dirname;
swig = require('swig');
swig.setFilter('inArray', function(arr, key){
  return (arr && arr.indexOf ? (arr.indexOf(key) != -1) : false);
});

conf = {
	http_port : process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || settings.httpPort || DEFAULT.httpPort
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
    res.setHeader( 'Server', 'scriptbox' );
    res.setHeader( 'X-Author', 'BADINGA BADINGA ULRICH ARTHUR' );
    res.setHeader( 'X-Copy', '(c) Oshimin Labs 2014' );
    res.removeHeader('X-Powered-By');
    next();
  });
  server.use(require("morgan")(process.env.NODE_ENV || 'dev'));
  server.use(require('cookie-parser')(DEFAULT.id));
  server.use(require('body-parser')());
  server.use(require('method-override')());
  server.use(sessions({
    secret: DEFAULT.id,
    proxy: true,
    resave: true,
    saveUninitialized: true,
    name: "osh",
    store: new CaminteStore({
        driver: 'tingodb',
        collection: 'sessions',
        db: {
          database : getDir("app://db")
        },
        maxAge: 30000000, // 5h
        clear_interval: 60 // 1 min
    })
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

// register pligin router
server.use(pluginRouter);

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
  mem = memory.server();
  setTimeout(function(){
    pluginRouter.get('/toto', (req,res)=>{
      res.send("toto")
    })
  },5000)
});


process.on('exit', function(){
  try{
    server.close(); // socket file is automatically removed here
    mem.close();
  }catch(e){}
});

function shutdown() {
    try{
      server.close(); // socket file is automatically removed here
      mem.close();
    }catch(e){}
    process.exit();
}