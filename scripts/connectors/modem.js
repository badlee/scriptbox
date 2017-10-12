/* init app */
var shorty = require('shorty');
var app = null;
var connector = require(path.join(__dirname,'..','..','connector.js'));
var path = require('path');

var modem = require('modem').Modem();

process.on("message",function(m){
	if (m === 'stop'){
 		if(app){
 			app.unbind();
 			app.shouldReconnect = false;
 			app = null;
 		}
 	}else if (m.type === 'start'){
 		if(!app){
 			start(m.data);
 		}else if(app && !app.connected)
 				app.connect(); 		
 	}else if(m.type == "message"){
		sendSMS(m.message);
		//console.log(arguments,Object.keys(VMs));
	}
 });
var sendSMS = function(data){}
var fromSMS = function(data){
	return {
		'sender': data.sender,
        'receiver': app.number,
        'msgdata': data.text,
        'time': data.time,
        'smsc_id' : data.smsc
	}
}
var start = function(conf){
	modem.open(conf.device, function() {
		sendSMS = function(data){
			modem.sms({
				receiver: data.receiver,
				encoding: '7bit',
				text: data.msgdata
			},function(err, sent_ids) {
				console.log('>>', arguments);
				if(err)
					console.log('Error sending sms:', err);
				else{
					process.send({
						"type": "stats++",
						"id" : sent_ids[0]
					});
					console.log('Message sent successfully, here are reference ids:', sent_ids.join(','));
				}
			});
		}
		process.send({
			"type": "online",
			"online" : true,
			"connection" : Date.now()
		});
		
		modem.on('sms received', (sms)=> {
			console.log(sms);
			this.connector.execSMS(fromSMS(sms));
		});
		this.connector = new connector;
		this.connector.on("sendSMS",function(data){
			sendSMS(data);
		});
		this.connector.on("successSMS",function(data){});
		this.connector.on("failSMS",function(data){});

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
}