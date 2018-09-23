var path = require('path'),
	vm = require("vm"),
	fs = require("fs"),
	logger = require("console").Console,
	util = require("util"),
	memory = require("./memory"),
	events = require("events");
	CoffeeScript = require('coffee-script');
var colors = require('colors');
var convertCode = function (data, type) {
	switch(type){
		case 'text/coffeescript':
			return CoffeeScript.compile(data.toString());
		default:
			return data;
	}
}
	function VMStream(filename,id,error) {
		this.filename = filename;
		this.id = id;
		this.error = !!error;
	}
	util.inherits(VMStream,events.EventEmitter)
	
	VMStream.prototype.write = function(message) {
	    process.stdout
	    	.write( ("VM-SMS " + (this.error ? "ERROR" : "LOG") +' "' +this.filename + '" "'+ this.id +'" > '+ message).grey);
	}

	var sessions = {};
	var localStorage = {};
var preScript = "("+(function(){
	if(!Array.prototype.rnd){
		Object.defineProperty(Array.prototype,'rnd',{
			get:function (){
				var randscript = -1, 
					max = this.length-1;
				while (randscript < 0 || randscript > max || isNaN(randscript))
					randscript = parseInt(Math.random()*(max+1));
				return this[randscript]; 
			}
		});
	};
	if(!Array.prototype.sql){
		/*
		Usage : 
			var data = [{a:1,b:1,c:1},{a:1,b:2,c:1},{a:1,b:3,c:1}, {a:2,b:1,c:1}];
			var res = data.sql('SELECT a, COUNT(*) AS b FROM ? GROUP BY a');
			console.log(res);
		*/
		Object.defineProperty(Array.prototype,'sql',{
			value : function (sql){
				var alasql = require("alasql");
				alasql.databases.alasql.tables.data = this ;
				return alasql(sql);   
			}
		});
	};
}).toString()+")()";
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
 	url : function(){
 		return require("url");
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
	},
	alasql : function(){
		return require('alasql');
   }
 }
 var adapter = {
			"arango" : 	["","arango"],
			"node-firebird" : 	["" ,"firebird"],
			"mongodb" : 	["createConnection","mongodb"],
			"mongoose" : 	["createConnection","mongoose"],
			"mongoose/schema" : 	["Schema","mongoose-schema"],
			"mysql" : 		["createConnection","mysql"],
			"nano" : 		["","nano"],
			"neo4j" : 		["","neo4j"],
			"pg" : 			["Client","postgres"],
			"redis" : 		["createClient" ,"redis"],
			"rethinkdb" : 	["","rethinkdb"],
			"riak-js" : 		["","riak"],
			"sqlite3" : 	["","sqlite"],
			"tingodb" : 	["", "tingodb"]
	}
	console.log("Expose module to VMs".grey, process.argv[4].grey,process.argv[2].grey);
	for(var i in adapter){
		try {
    		require.resolve(i.split('/')[0]);
    		console.log("resolve ".grey,adapter[i][1].grey,'(',i.split('/')[0].yellow,')',"...OK".grey);
    		allowNativeModules[adapter[i][1]] = (function(m,name){
		 		if(name){
		 			var mod = require(m);
		 			var ret = mod[name];
		 			if(ret instanceof Function)
		 				return ret.bind(mod);
		 			else
		 				return ret;
		 		}
		 		return require(m);
		 	}).bind(null,i.split('/')[0],adapter[i][0]);
		} catch(e){
    		console.log("resolve ".grey,adapter[i][1].grey,'(',i.split('/')[0].yellow,')',"...FAILS".grey);
    		console.log("\t",e)

		}
	}

 process.on("message",function(m){
 	if (m.type === 'settings'){
 		settings = m.data;
 	}else if (m.type === 'setDIR'){
 		__DIR = m.data;
 	}else if (m.type === 'sms'){
 		// console.log("recieve SMS",m.time);
 		m.msgdata_orig = m.msgdata;
		m.msgdata = new Buffer(m.msgdata).toString().trim();
		m.receiver = new Buffer(m.receiver).toString().toLowerCase();
		m.sender = new Buffer(m.sender).toString().toLowerCase();
		var priv = Symbol(m.sender);
		m[priv] = true;
		m.fileType = m.script.type;
		m.file = m.script.file;
		var sendError = function(err){	
		  	var tmp = m.receiver;
			m.receiver = m.sender;
			m.sender = tmp;
		  	console.log(("SMS SEND Exec Error".red, process.argv[2],m.file, err.stack || err).grey);
		  	m.msgdata =   settings.defautErrorMSG || "EXEC ERROR";
		  	process.send(m);
		};
 		if(!script[m.file]){
			try{data = fs.readFileSync(m.file);}catch(e){return sendError(e);}
			script[m.file] = vm.createScript(preScript+";"+convertCode(data,m.fileType), m.file);
		  	fs.watchFile(m.file, (function (file,sendError,curr, prev) {
		  		console.log('VM script reload: '.grey, process.argv[4].grey,process.argv[2].grey , file);
				try{data = fs.readFileSync(file);}catch(err){return   console.log('VM Script Exception: '.grey, process.argv[4].grey,process.argv[2].grey , err);}
				script[file] = vm.createScript(preScript+";"+convertCode(data,m.fileType), file);
		  	}).bind(null,m.file,sendError));
		}
		/* definition de la session et du storage */
			var _id = new Buffer(m.sender).toString();
		m.filename = path.basename(m.file);
		var MSG = function(conf){
		  		conf = conf || {};
				if(this instanceof arguments.callee){
					for (var property in conf)
						this[property] = conf[property];
					if(conf[priv]){
						var tmp = this.receiver;
						this.receiver = this.sender;
						this.sender = tmp;
					}
					delete this.type;
					Object.defineProperties(this, {
						sendSMS : {
							value: function(msg){
								if(msg)
									this.msgdata = msg;
						  		process.send(this);
						  	},
							writable: false,
							enumerable: false,
							configurable: false
						},
						send : {
							value: function(msg){
								if(msg)
									this.msgdata = msg;
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
		  			return modules[name] = allowNativeModules[name]();
		  		var n = path.join(__DIR,"scripts","modules" ,name);
		  		if(!fs.existsSync(n)) throw "Module "+name+" not found";
		  		try{
			  		var data = fs.readFileSync(n);
			  		var sand = {
			  			exports : {},
			  			module : {
				  			id : name,
				  			exports : null
				  		},
						session : new memory.Client(_id),
						localStorage : new memory.Client(m.keywords[0].toLowerCase()),
						globalStorage : new memory.Client(m.receiver),
						logger : new logger(new VMStream(name, "module-"+name),new VMStream(name, "module-"+name,true)),
						Buffer : Buffer,
					  	require : require,
					  	get MSG() {return MSG }
					};
			  		vm.runInNewContext(preScript+";"+data, sand);
			  		fs.watchFile(n, (function (file,curr, prev) {
				  		console.log('Module VM script reload: '.grey, process.argv[4].grey,process.argv[2].grey , file);
						try{data = fs.readFileSync(file);}catch(err){return   console.log('Module VM Script Exception: '.grey, process.argv[4].grey,process.argv[2].grey , err);}
						vm.runInNewContext(preScript+";"+data, sand);
						modules[name]=sand.module.exports ? sand.module.exports : sand.exports;
				  	}).bind(null,n));
			  		return modules[name]=sand.module.exports ? sand.module.exports : sand.exports;
			  	}catch(e){
			  		throw e;
			  	}
		  	};
		try{
			script[m.file].runInContext(vm.createContext({
				sms : m ,
				logger : new logger(new VMStream(path.basename(m.file), m.id),new VMStream(path.basename(m.file), m.id,true)),
				Buffer : Buffer,
			  	now : Date.now(),
			  	require : require,
			  	get MSG() {return MSG },
				session : new memory.Client(_id),
				localStorage : new memory.Client(m.keywords[0].toLowerCase()),
				globalStorage : new memory.Client(m.receiver)
			})); 
		}catch(e){
			return sendError(e);
		}
		delete sandbox;
	}
 });


process.on('uncaughtException', function(err) {
  console.log('VM Caught exception: '.grey, process.argv[4].grey,process.argv[2].grey , err.stack);
});