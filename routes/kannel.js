var kannel = require('kannel');
var status = kannel.status;
var path = require('path');
var fs = require('fs');
var url = require('url');
var colors = require('colors');
var cache = {};
var md5 = require('MD5');
var languageTypes = {
    ".js": "js"
};
var VMs = {};
var stats = {
	received : 0,
	sent : 0,
	byNum : {}
}

Object.defineProperties(languageTypes, {
	initVM : {
		value: function() {
			//for(var i in this){
					for(var j = (settings.maxPool || 5); j--;){
					VMs[j] = require('child_process').fork(path.resolve(__dirname,"..",'vm.js'),[this[0]]);
					VMs[j].send({type:"setDIR", data:__DIR});
					VMs[j].send({type:"settings", data:settings});
					VMs[j].on('message', function(m) {
						if (m.type === 'sms'){
							stats.sent++;
							var id = new Buffer(m.receiver).toString();
							stats.byNum[id] = stats.byNum[id] || {sent : 0, received:0};
							stats.byNum[id].sent++;
							sendSMS(m);
						}
					});
				}
			//}
		},
		writable: false,
		enumerable: false,
		configurable: false
	},
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
	}
});

/* init app */
var app = new kannel.smsbox(conf);

var retryConnect = null;
var retryToConnect = function(){
	clearTimeout(retryConnect);
	retryConnect = setTimeout(function(){
		console.log("SMS WARN\t\t...retry to connect".yellow);
		app.connect();
	},10000);
	return retryConnect;
}
app.on("admin",function(data){
	switch(data.command){
		case status.admin.shutdown:
			/*Shutdown*/
			console.log("SMS WAR Receive shutdown command...retry to connect every 10s".yellow);
			app.close();
			retryToConnect();
			break;
	};
});

var sendSMS = function(data){
	app.sendSMS(data);
	new Models.SMS({ 
		pdu: data,
		sms : (data.msgdata || "").toString(),
		from: data.sender.toString(),
		to: data.receiver.toString(),
		SMSC: (data.smsc_id || "").toString(),
		MotCle : "",
		success : false,
		received : false
	}).save(function(err){
		//if(err)
			//console.log(err);
	});
	console.log(("SMS LOG "+data.sender.toString()+" SENT").grey);
}

var failSMS = function(data){
	app.write("ack",{
		nack : status.ack.failed,
		id   : data.id
	});
	new Models.SMS({ 
		pdu: data,
		sms : (data.msgdata || "").toString(),
		from: data.sender.toString(),
		to: data.receiver.toString(),
		SMSC: data.smsc_id.toString(),
		MotCle : "",
		success : false
	}).save(function(err){
		//if(err)
			//console.log(err);
	});
	console.log(("SMS LOG "+data.sender.toString()+" FAIL").grey);
}
var successSMS = function(data,script,keyword){
	app.write("ack",{
		nack : status.ack.success,
		id   : data.id
	});
	new Models.SMS({ 
		pdu: data,
		sms : (data.msgdata || "").toString(),
		from: data.sender.toString(),
		to: data.receiver.toString(),
		SMSC: data.smsc_id.toString(),
		MotCle : keyword,
		script : script,
		success : true
	}).save(function(err){
		//if(err)
			//console.log(err);
	});
	console.log(("SMS LOG "+data.sender.toString()+' "'+ keyword +'" '+script+'  SUCCESS').grey);
}
var execSMS = function(data,err,items){
	if(err || !items || (items && !items.length))
		return failSMS(data);
	var sms = data.msgdata.toString();
	var keyword = sms.split(" ");
	if(items.length){
		for(var i in items){
			if((new RegExp(items[i].keyword,'i')).test(sms)){
				items = items[i];
				break;
			}
		}
	}
	console.log(("receive SMS "+data.id+" MotCle "+items.id).grey);
	var expression = items["validator-val"].split("[:ø:]");
	var valid = new RegExp(expression[0] || "",expression[1] || "");
	if(!valid.test(sms))
		failSMS(data);
	expression = items["blackList-val"].split("[:ø:]");
	if((new RegExp(expression[0] || "",expression[1] || "")).test(sms))
		failSMS(data);
	
	successSMS(data,items.scriptId,keyword[0]);
	/* reecri le sms */
	if(items.rewriter){
		data.msgdata_orig = data.msgdata;
		sms = sms.replace(valid,items.rewriter);
		keyword = sms.split(" ");
		data.msgdata = sms;
	}
	data.id = true;
	data.sender = data.sender.toString();
	data.receiver = data.receiver.toString();
	languageTypes.execScript(items["scriptId-val"],data,keyword);
};
app.on("sms",function(data){
	/*Stats*/
	var id = data.sender.toString();
	stats.byNum[id] = stats.byNum[id] || {sent : 0, received:0};
	stats.byNum[id].received++;
	stats.received++;
	/*end stats*/
	var sms = data.msgdata.toString();
	var keyword = sms.split(" ");
	/* looking for keyword */
	var name = path.join(__DIR,"scripts","keywords", md5(keyword[0].toLowerCase()));
	fs.exists(name, function (exists) {
		if(!exists)
	  		return execSMS(data,"Not found");
	  	fs.readFile(name, function (err, json) {
			if(err) return execSMS(data,err);
			execSMS(data,null,[JSON.parse(json)]);
		});
	});
});

app.on("error",function(e){
    if(["EPIPE","ECONNREFUSED"].indexOf(e.code) > -1)
		retryToConnect();
});

app.on('connect',function(){
	clearInterval(retryConnect);
	console.log(("SMS LOG scripting box is connected to "+app.conf["host"]+":"+app.conf['port']).grey);
	languageTypes.initVM();
});

module.exports = function(server){
	server.get("/info.json",function(req,res){
		res.json({
			uptime : process.uptime(),
			now : Date.now(),
			memoryUsage : process.memoryUsage(),
			memoryOs : {
				total : require("os").totalmem(),
				free : require("os").freemem(),
			},
			platform : process.platform,
			arch : process.arch,
			nodeVersion : process.version
		});
	})
	server.get("/stats.json",function(req,res){
		res.json({
			sent : stats.sent,
			received : stats.received
		});
	});
	server.get(/^\/numStats(\/)?$/i,function(req,res){
		res.json(stats.byNum);
	})
	server.get(/^\/numStats\/(.*)\.json$/i,function(req,res){
		if(req.params[0] && req.params[0] in stats.byNum)
			res.json(stats.byNum[req.params[0]]);
		else
			res.json(404,null);
	})

	server.get("/cgi-bin/sendsms",function(req,res,next){

		var query = url.parse(req.url,1).query;
		var sms = {
			msgdata : query.text,
			sender  : query.from || "****",
			receiver :query.to || false 
		};
		res.charset = 'utf-8';
		res.set('Content-Type', 'text/plain');
		if(!sms.msgdata)
			return res.send(403,"Missing text");
		if(!sms.receiver)
			return res.send(403,"Missing receiver");
		if(!query.username)
			return res.send(403,"Missing username");
		if(!query.password)
			return res.send(403,"Missing password");

		Models.user.findOne({where: {username : query.username }}, function(err, user) {
	        if (err) { return res.send(500,"Unknown Error"); }
	        if (!user) { return res.send(404,'Unknown user ' + query.username); }
	        if (!user.actif) { return res.send(403,'Invalid user ' + query.username)}
	        if ('undefined' === typeof user.droits.sendsms || ('undefined' !== typeof user.droits.sendsms && !user.droits.sendsms)) { return res.send(403,'Unautorized')}
	        if (user.smsPWD != query.password) { return res.send(403,'Invalid password') }
	        stats.sent++;
			stats.byNum["KANEL"] = stats.byNum["KANEL"] || {sent : 0, received:0};
			stats.byNum["KANEL"].sent++;
			sendSMS(sms);
			return res.send(200,"Message sent");
	      })
	})
	app.connect();
};
