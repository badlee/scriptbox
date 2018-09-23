/* init app */
var kannel = require('kannel');
var app = null;
var path = require('path');

var connector = require(path.join(__dirname,'..','..','connector.js'));

var status = kannel.status;
var retryConnect = null;
process.on("message",function(m){
 	if (m === 'stop'){
 		if(app){
 			app.close();
 			clearTimeout(retryConnect);
 			app = null;
 		}
 	}else if (m.type === 'start'){
 		if(app && !app.connected){
 			clearTimeout(retryConnect);
 			app = null;
 		}
 		start(m.data); 		
 	}else if(m.type == "message" || m.type == "sms"){
		app.sendSMS(m.message);
		//console.log(arguments,Object.keys(VMs));
	}
 });

var start = function(conf){
	conf.port = Number(conf.port);
	app = new kannel.smsbox(conf);
	var retryToConnect = function(){
		clearTimeout(retryConnect);
		retryConnect = setTimeout(function(){
			console.log("SMS WARN\t\t...retry to connect".yellow);
			start(conf);
		},10000);
		return retryConnect;
	}
	app.on('close',function(){
		process.send({
			"type": "online",
			"online" : false,
			"connection" : -1
		});
	})
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
	app.on("sms",function(data){
		app.write("ack",{
			nack : status.ack.buffered,
			id   : data.id
		});
		this.connector.execSMS(data);
		return;
	});

	app.on("error",function(e){
	    if(["EPIPE","ECONNREFUSED"].indexOf(e.code) > -1)
			retryToConnect();
	});

	app.on('connect',function(){
		clearInterval(retryConnect);
		console.log(("SMS LOG scripting box is connected to "+app.conf["host"]+":"+app.conf['port']).grey);
		process.send({
			"type": "online",
			"online" : true,
			"connection" : Date.now()
		});
		this.connector = new connector;
		this.connector.on("sendSMS",function(data){
			app.sendSMS(data);
		});
		this.connector.on("successSMS",function(data){
			app.write("ack",{
				nack : status.ack.success,
				id   : data.id
			});
		});
		this.connector.on("failSMS",function(data){
			app.write("ack",{
				nack : status.ack.failed,
				id   : data.id
			});
		});
		this.connector.on("stats++",function(id){
			process.send({
				"type": "stats++",
				"id" : id
			});
		});
		this.connector.on("stats--",function(id){
			process.send({
				"type": "stats--",
				"id" : id
			});
		});

	});
	app.connect();
}