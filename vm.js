var path = require('path'),
	vm = require("vm"),
	fs = require("fs"),
	logger = require("console").Console,
	util = require("util"),
	events = require("events");
var colors = require('colors');
	function VMStream(filename,id,error) {
		//this.data = [];
		this.filename = filename;
		this.id = id;
		this.error = !!error;
	}

	VMStream.prototype.write = function() {
	    process.stdout
	    	.write( ("VM-SMS " + (this.error ? "ERROR" : "LOG") +' "' +this.filename + '" "'+ this.id +'" > '+ util.format.apply(this, arguments)).grey);
	}

	var sessions = {};
	var localStorage = {};

var lang = false;
 var script = {};
 var modules = {};
 var settings = {};
 var allowNativeModules = {
 	tcp : function(){
 		return {
 			http : require("http").request,
 			https: require("https").request,
 			socket  : require("net").connect,
 			dgram :  require('dgram').createSocket,
 			tls : require('tls').connect
 		};
 	},
 	assert : function(){
 		return require("assert");
 	},
 	md5 : function(){
 		return require("MD5")
 	},
 	randomstring : function(){
 		return require("randomstring");
 	},
 	punycode : function(){
 		return require("punycode");
 	},
 	dns : function(){
 		return require('dns');
 	},
 	events : function(){
 		return require('events');
 	}
 }
 process.on("message",function(m){
 	if (m.type === 'settings'){
 		settings = m.data;
 	}else if (m.type === 'setDIR'){
 		__DIR = m.data;
 	}else if (m.type === 'sms'){
 		console.log("recieve SMS",m.time);
		var sendError = function(err){	
		  	var tmp = m.receiver;
			m.receiver = m.sender;
			m.sender = tmp;
		  	console.log(("SMS SEND Exec Error", process.argv[2],m.file, err.stack || err).grey);
		  	m.msgdata =   settings.defautErrorMSG || "EXEC ERROR";
		  	process.send(m);
		};
 		if(true || !script[m.file]){
			try{data = fs.readFileSync(m.file);}catch(e){return sendError(e);}
			  script[m.file] = vm.createScript("if(!Array.prototype.rnd)Object.defineProperty(Array.prototype,'rnd',{\
					get:function (){\
					var randscript = -1, max = this.length-1;\
					while (randscript < 0 || randscript > max || isNaN(randscript))\
						randscript = parseInt(Math.random()*(max+1));\
					return this[randscript];\
				}});\n\n"+data, m.file);
		}
		/* definition de la session et du storage */
			var _id = new Buffer(m.sender).toString();
			/* Session*/
		sessions[_id] = sessions[_id] || {} ;
		// remove obsolete data
		if(sessions[_id].lastAccess && sessions[_id].lastAccess + 360000 < Date.now() )
			sessions[_id].data = {};
		else
			sessions[_id].data = sessions[_id].data || {};	
		sessions[_id].lastAccess = Date.now();
			/* Storage share memory */
		localStorage[m.keywords[0]] = localStorage[m.keywords[0]] || {};
		/* end */
		m.filename = path.basename(m.file);
		var MSG = function(conf){
		  		conf = conf || {};
				if(this instanceof arguments.callee){
					for (var property in conf)
						this[property] = conf[property];
					
					var tmp = this.receiver;
					this.receiver = this.sender;
					this.sender = tmp;
					delete this.type;
					Object.defineProperties(this, {
						sendSMS : {
							value: function(){
						  		process.send(this);
						  	},
							writable: false,
							enumerable: false,
							configurable: false
						},
						type : {
							value: "sms",
							writable: false,
							enumerable: true,
							configurable: false
						}
					});
				}else
					return new arguments.callee(conf);
		  	};
		  var require = function(name){
		  		name = name.split(/[ -]/).join("-").replace(/[^\w\-]+/g,"").toLowerCase();
		  		if(modules[name])
		  			return modules[name];
		  		if(allowNativeModules[name])
		  			return modules[name] = allowNativeModules[name];
		  		var n = path.join(__DIR,"scripts","modules" ,name);
		  		if(!fs.existsSync(n)) throw "Module "+name+" not found";
		  		try{
			  		var n = fs.readFileSync(n);
			  		var sand = {
			  			exports : {},
			  			module : {
				  			id : n,
				  			exports : null
				  		},
						get sessions () { return sessions[_id].data },
						get localStorage (){ return localStorage[m.keywords[0]] },
						logger : new logger(new VMStream(path.basename(m.file), m.id),new VMStream(path.basename(m.file), m.id,true)),
						Buffer : Buffer,
					  	now : Date.now(),
					  	require : require,
					  	get MSG() {return MSG }
					};
			  		vm.runInNewContext(n, sand);
			  		return modules[name]=sand.module.exports ? sand.module.exports : sand.exports;
			  	}catch(e){
			  		throw e;
			  	}
		  	};
		try{ script[m.file].runInContext(vm.createContext({
			get sessions () { return sessions[_id].data },
			sms : m ,
			get localStorage (){ return localStorage[m.keywords[0]] },
			logger : new logger(new VMStream(path.basename(m.file), m.id),new VMStream(path.basename(m.file), m.id,true)),
			Buffer : Buffer,
		  	now : Date.now(),
		  	require : require,
		  	get MSG() {return MSG }
		})); }catch(e){return sendError(e);}
		//console.log("[",process.argv[2],"]","OUT : " , sandbox._stdout.data);	  
		//console.log("[",process.argv[2],"]","ERR : " , sandbox._stderr.data);
		//console.log("[",process.argv[2],"]","Session : " , sessions[_id]);
		delete sandbox;
	}
 });
