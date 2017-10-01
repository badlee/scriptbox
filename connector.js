var path = require('path');
var fs = require('fs');
var url = require('url');
var colors = require('colors');
var cache = {};
var md5 = require('MD5');
var util = require("util");
var events = require("events");
var argv = process.argv;
	argv.shift();
	argv.shift();
var forceString = function(s){
	var ret = [];
	for(var i in s)
		if(!isNaN(i))
			ret[Number(i)] = s[i];
	return ret.join("");
}
var s = function (shortNumbers){
	if(!shortNumbers)
		return [];
	if(shortNumbers.items)
		shortNumbers = shortNumbers.items;
	return (shortNumbers instanceof Array ? shortNumbers : [shortNumbers.stripColors ? shortNumbers.stripColors : shortNumbers] ).map(function(i){
			return forceString(i.stripColors ? i.stripColors : i)
		});
}
function initVm(j){
	try{VMs[j].kill();}catch(e){};
	VMs[j] = null;
	VMs[j] = require('child_process').fork(path.resolve(__dirname,'vm.js'),argv);
	VMs[j].send({type:"setDIR", data:__dirname});
	VMs[j].send({type:"settings", data:settings});
	VMs[j].on('message', (function(m) {
		if (m.type === 'sms'){
			this.sendSMS(m,new Buffer(m.receiver).toString());
		}
	}).bind(this));
	VMs[j].on('error',(function(j){
		initVm.call(this,j);			
		console.log(process.argv,"VMs ERROR", arguments);
	}).bind(this,j))
}
function Connector() {
    events.EventEmitter.call(this);
	for(var j = (settings.maxPool || 5); j--;)
		initVm.call(this,j);
	
}
util.inherits(Connector, events.EventEmitter);

var VMs = {};

process.on('exit', function(){
	for(var i in VMs)
		VMs[i].kill();
});
process.on('uncaughtException', function(err) {
  console.log('Caught exception: ' + err);
});
/* load models */
Models = {};
settings = require(path.resolve(__dirname,"settings.json"))
var	caminte = require('caminte'),
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
    },
	schema = new Schema(db.driver, db),
    schemaProd = new Schema(dbProd.driver, dbProd);

fs.readdirSync(path.join(__dirname,"models")).forEach(function(route){
	require(path.join(__dirname,"models",route))(schema,schemaProd);
});


Object.defineProperties(Connector.prototype, {
	execScript : {
		value: function(script,sms,keyword) {
			this.currVM = this.currVM+1 >= (settings.maxPool||5) ? 0 :  this.currVM+1;
			sms.type = "sms";
			sms.file = script;
			sms.keywords = keyword;	
			VMs[this.currVM].send(sms);
		},
		writable: false,
		enumerable: false,
		configurable: false
	},
	currVM : {
		value: -1,
		writable: true,
		enumerable: false,
		configurable: false
	},
	sendSMS  : {
		value: function(data,id){
			console.log("send SMS",id,new Buffer(data.receiver).toString(),new Buffer(data.sender).toString(),data.msgdata.toString());
			this.emit("stats++",id);
			this._sendSMS(data);
		},
		writable: false,
		enumerable: false,
		configurable: false
	},
	_sendSMS  : {
		value: function(data){
			try{this.emit("sendSMS",data);}catch(e){}
			new Models.SMS({ 
				pdu: data,
				sms : new Buffer(data.msgdata || "").toString(),
				from: new Buffer(data.sender || "").toString(),
				to: new Buffer(data.receiver || "").toString(),
				SMSC: new Buffer(data.smsc_id || "").toString(),
				MotCle : "",
				success : false,
				received : false
			}).save(function(err){
				//if(err)
					//console.log(err);
			});
		},
		writable: false,
		enumerable: false,
		configurable: false
	},
	failSMS  : {
		value: function(data,raison){
			console.log("failSMS",raison);	
			try{this.emit("failSMS",data,raison);}catch(e){};
			var save = { 
				pdu: data,
				sms : new Buffer(data.msgdata || "").toString(),
				from: new Buffer(data.sender || "").toString(),
				to: new Buffer(data.receiver || "").toString(),
				SMSC: new Buffer(data.smsc_id || "").toString(),
				MotCle : "",
				success : false,
				raison : raison
			};
			new Models.SMS(save).save(function(err){
				if(err)
					console.log(err);
			});
		},
		writable: false,
		enumerable: false,
		configurable: false
	},
	successSMS : {
		value : function(data,script,keyword){
			try{this.emit("successSMS",data);}catch(e){}
			new Models.SMS({ 
				pdu: data,
								sms : new Buffer(data.msgdata || "").toString(),
				from: new Buffer(data.sender || "").toString(),
				to: new Buffer(data.receiver || "").toString(),
				SMSC: new Buffer(data.smsc_id || "").toString(),
				MotCle : keyword,
				script : script,
				success : true
			}).save(function(err){
				//if(err)
					//console.log(err);
			});
		},
		writable: false,
		enumerable: false,
		configurable: false
	},
	runSMS : {
		value : function(data,err,items){
			var id = (data && data.receiver ? data.receiver : "unknow").toString();
			console.log("receive SMS",id,new Buffer(data.receiver).toString(),new Buffer(data.sender).toString(),data.msgdata.toString());
			this.emit("stats--",id);
			if(err || !items)
				return this.failSMS(data, err ? err : "Pas d'items" );

			var sms = data.msgdata.toString();
			var keyword = sms.trim().split(/\s+/);;
			var to = data.receiver.toString();
			if(items[to]) // service binded to shortCode
				items = items[to];
			else if(items["*"]) // default service
				items = items["*"];
			else if(!("keyword" in items))
				return this.failSMS(data,'No route found');
			//items.shortNumbers = s(items.shortNumbers);
			if(Array.isArray(items.shortNumbers) && items.shortNumbers.length && items.shortNumbers.indexOf(to) == -1)
				return this.failSMS(data,'No route found');
			/*if(items.length){
				for(var i in items){
					if((new RegExp(items[i].keyword,'i')).test(sms)){
						items = items[i];
						break;
					}
				}
			}*/

			console.log(("receive SMS "+data.id+" MotCle "+keyword[0]).grey);
			var expression = items["validator-val"].split("[:ø:]");
			var valid = new RegExp(expression[0] || "",expression[1] || "");
			if(!valid.test(sms))
				return this.failSMS(data,"Validation Test Fails");
			expression = items["blackList-val"].split("[:ø:]");
			if((new RegExp(expression[0] || "",expression[1] || "")).test(sms))
				return this.failSMS(data,"blackList Validation Test OK");
			
			this.successSMS(data,items.scriptId,keyword[0]);
			/* reecri le sms */
			if(items.rewriter){
				data.msgdata_orig = data.msgdata;
				sms = sms.replace(valid,items.rewriter);
				keyword = sms.trim().split(/\s+/);;
				data.msgdata = sms;
			}
			data.id = true;
			data.sender = data.sender.toString();
			data.receiver = data.receiver.toString();
			this.execScript(items["scriptId-val"],data,keyword);
		},
		writable: false,
		enumerable: false,
		configurable: false
	},
	execSMS : {
		value : function(data){
			/* looking for keyword */
			var sms = data.msgdata.toString();
			var keyword = sms.trim().split(/\s+/);
			var name = path.join(__dirname,"scripts","keywords", md5(keyword[0].toLowerCase()));
			fs.exists(name,(function (exists) {
				if(!exists)
			  		return this.execDBKeyword(data);
			  	fs.readFile(name, (function (err, json) {
					if(err) return this.runSMS(data,err);
					this.runSMS(data,null,JSON.parse(json));
				}).bind(this));
			}).bind(this));
		},
		writable: false,
		enumerable: false,
		configurable: false
	},
	execDBKeyword : {
		value : function(data){
			/* looking for keyword */
			var sms = data.msgdata.toString();
			var keyword = sms.trim().split(/\s+/);
			console.log({keyword:{$eq:keyword[0]}})
			Models.MotCle.find({keyword:keyword[0]}).exec((function(err, items) {
				console.log(err,items)
				if(err)
					return this.runSMS(data,err);
				if(!items)
					return this.runSMS(data,name+" Not found"+keyword[0]);
				
				var to = (data && data.receiver ? data.receiver : "unknow").toString();
				var items = items.map(function(item){
					item.shortNumbers = s(item.shortNumbers);
					return item;
				}).filter(function(item){
					if(Array.isArray(item.shortNumbers) && item.shortNumbers.indexOf(to) !== -1)
						return true;
					if(Array.isArray(item.shortNumbers) && item.shortNumbers.length === 0)
						return true;
					return false;				
				})
				this.runSMS(data,null,items.length ? items[0] : null);
			  }).bind(this))
		},
		writable: false,
		enumerable: false,
		configurable: false
	}
});


module.exports = Connector;