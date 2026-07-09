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
// Use local swig library instead of npm package
swig = require('./lib/swig');

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
