var path = require('path');
var fs = require('fs');
var url = require('url');


var stats = {
	received : 0,
	sent : 0,
	byNum : {}
}


/* load connectors */
var connectors = {};
VMs = {};
initVMs = function(item){
	if(!connectors[item.type]) return;
	VMs[item.name] = require('child_process').fork(connectors[item.type],[item.id,item.name,item.type]);	
	VMs[item.name]._send = VMs[item.name].send;
	VMs[item.name].send = function(m){
		try{
			this._send(m);
		}catch(e){
			if(e.message == "channel closed"){
				initVMs(VMs[item.name].item);
				try{
					VMs[item.name]._send(m);
				}catch(e){
					console.log("ERROR ON RE-SEND",JSON.stringify(e.message));
				}
			}
			console.log("ERROR ON SEND",JSON.stringify(e.message));
		}
	}
	VMs[item.name].sent = 0;
	VMs[item.name].received = 0;
	VMs[item.name].settings = 0;
	VMs[item.name].online = false;
	VMs[item.name].connection = -1;
	VMs[item.name].getInfo = function(){
		return {
			received : this.received,
			sent : this.sent,
			online : this.online ? (Date.now()-this.connection)/1000 : 'offline'
		}
	}
	VMs[item.name].item = item;
	if(item.conf)
		VMs[item.name].send({type:"start", data:item.conf});
	VMs[item.name].on("message",function(m){
		if (m.type === 'stats++'){
			this.sent++; 
	 		stats.sent++;
			stats.byNum[m.id] = stats.byNum[m.id] || {sent : 0, received:0};
			stats.byNum[m.id].sent++;
	 	}else if (m.type === 'stats--'){
	 		this.received++;
	 		stats.received++;
			stats.byNum[m.id] = stats.byNum[m.id] || {sent : 0, received:0};
			stats.byNum[m.id].received++;
	 	} else if(m.type == "settings"){
	 		this.settings = m.data;
	 	} else if(m.type == "online"){
	 		this.online = m.online;
	 		this.connection = m.connection;
	 	}
	});
}
process.on('exit', function(){
	for(var i in VMs)
		VMs[i].kill();
});
fs.readdirSync(path.join(__dirname,'..',"scripts","connectors")).forEach(function(route){
	connectors[route] = path.join(__dirname,'..',"scripts","connectors",route);
});

Models.Connector.find({},function(err,items){
	if(err)
		return err;
	for(var i = 0; i<items.length;i++)
		initVMs(items[i]);
})

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
			received : stats.received,
			connectors : (function(){ var ret = {};for(i in VMs) ret[i] = VMs[i].getInfo(); return ret;})()
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
			//sendSMS(sms,'KANEL');
			return res.send(200,"Message sent");
	      })
	})
};


/* Charge les connecteurs */