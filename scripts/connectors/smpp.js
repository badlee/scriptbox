/* init app */
var smpp = require('smpp');
var app = null;
var path = require('path');

var connector = require(path.join(__dirname,'..','..','connector.js'));

process.on("message",function(m){
 	if (m === 'stop'){
 		if(app){
 			app.close();
 		}
 	}else if (m.type === 'start'){
 		if(!app){
 			start(m.data);
 		}else if(app && !app.connected)
 				app.connect(); 		
 	}
 });
var sendSMS = function(data){
	app.sendMessage(data);
}
var toPDU = function(data){
	return {
       source_addr_ton: Number(app.config.addr_ton),
       source_addr: data.sender,
       dest_addr_ton: Number(app.config.addr_ton),
       destination_addr: data.receiver,
       data_coding: data.coding,
       short_message: data.msgdata
	}
}

var fromPDU = function(data){
	return {
		'sender': data.source_addr,
        'receiver': data.destination_addr,
        'msgdata': data.short_message,
        'time': data.schedule_delivery_time,
        'service': data.service_type,
        'id': data.sequence_number,
        'mclass': data.esm_class,
        'coding': data.data_coding,
        'validity': data.validity_period,
        'charset': data.data_coding,
        'priority': data.priority_flag,
        'smsc_id' : app.config.system_id
	}
}
var start = function(conf){
	conf.port = Number(conf.port);
	app = smpp.connect(conf.host, conf.port);
	app.bind_transceiver({
	    system_id: conf.system_id,
	    password: conf.password
	});
	var retryConnect = null;
	var retryToConnect = function(){
		clearTimeout(retryConnect);
		retryConnect = setTimeout(function(){
			console.log("SMS WARN\t\t...retry to connect".yellow);
			app.connect();
		},10000);
		return retryConnect;
	}

	app.sendMessage = function(pdu){
		app.submit_sm({
            destination_addr: pdu.destination_addr,
            source_addr : pdu.source_addr,
            short_message:  pdu.short_message
        }, function(pdu) {
            if (pdu.command_status == 0) {
                // Message successfully sent
                //console.log(pdu.message_id);
            }
        });
	}
	/**
	 * The bindSuccess event is emitted after a bind_x_resp is received with an
	 * ESME_ROK status. It is not until this event is emitted that a client can be
	 * considered to be properly bound to an SMPP server.
	 */
	app.on('connect', function(pdu) {
		clearInterval(retryConnect);
		console.log(("SMS LOG scripting box is connected to "+conf["host"]+":"+conf['port']).grey);
		
	    //console.log('connect successful');
	    process.send({
			"type": "online",
			"online" : true,
			"connection" : Date.now()
		});
		this.connector = new connector;

		this.connector.on("sendSMS",function(data){
			sendSMS(toPDU(data));
		});
		
		this.connector.on("successSMS",function(data){
			;
		});
		this.connector.on("failSMS",function(data){
			;
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

	/**
	 * This event is emitted (TODO bug: sometimes more than once) when the client is
	 * disconnected from the server. This will always happen after an unbind, but
	 * can also happen after certain errors.
	 */
	app.on('close', function() {
	    //console.log('disconnected');
	    process.send({
			"type": "online",
			"online" : false,
			"connection" : -1
		});
	});

	app.on('error', function() {
	    //console.log('disconnected error');
	    retryToConnect();
	    process.send({
			"type": "online",
			"online" : false,
			"connection" : -1
		});
	});

	app.on('unbind', function(pdu) {
	    app.send(pdu.response());
	    app.close();
	})

	/**
	 * This event is emitted when the server sends a deliver_sm. All that is passed
	 * to the application is the parsed PDU. All strings will be left as buffers,
	 * and it is up to the application to determine the proper encoding.
	 *
	 * Typically, ASCII is appropriate for most fields. The short_message field
	 * should be decoded according to the data_coding field. If node.js doesn't
	 * support the encoding specified, the node-iconv library can be very helpful
	 * (https://github.com/bnoordhuis/node-iconv).
	 */


	app.on('deliver_sm', function(pdu) {
	    //console.log(pdu.source_addr.toString('utf8') + ' ' + pdu.destination_addr.toString('utf8') + ' ' + pdu.short_message.toString('utf8'));
	    this.connector.execSMS(fromPDU(pdu));
	});
	//app.connect();

}