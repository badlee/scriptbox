/* Simple Memcached in Javascript 
 * @Author: Sun, Junyi
 * @Email:  ccnusjy@gmail.com
 * @Date:   2012-8-3
*/
var tcp = require('net'),
	os  = require("os"),
	path= require("path"),
	emitter = require('events').EventEmitter;

var store = {};

util = require('util');

var crlf = "\r\n";
var crlf_len = crlf.length;

var error_replies = ['ERROR', 'NOT_FOUND', 'CLIENT_ERROR', 'SERVER_ERROR'];

String.prototype.explode = function(separator, limit) {
    var arr = this.split(separator);
    if (limit) arr.push( arr.splice(limit-1).join(separator) );
    return arr;
}

// trouver contrui un tableau si ca n'existe pas
function getStoreData(key, store,val){
	key = key.explode('.',2);
	console.log("0",key,JSON.stringify(store));
	if(store[key[0]] === undefined && key[1]!=="")
		store[key[0]] = {};
	else if(key[1]==="")
		store[key[0]] = val ? val : undefined;
	console.log("I",key,key.length,JSON.stringify(store));
	if(key[1] === "")
		return store;
	key2 = key[1].explode('.',2);
	console.log("II",key2,JSON.stringify(store[key[0]]));
	if(key2[1] !== "")
		store[key[0]][key2[0]] = getStoreData(key[1],store[key[0]],val);
	else if(val)
		store[key[0]][key2[0]] = val;
	return store;
}

function handle_header(header,crlf_len){
	var tup = header.split(" ")
	var expect_body_len = 0
	switch(tup[0]){
		case 'get':
		case 'delete':
			expect_body_len = 0
			break
		case 'set':
			expect_body_len = parseInt(tup[4]) + crlf_len
			break
	}
	return expect_body_len
}

function handle_body(socket,header,body,call_back){
	var response=""
	var tup = header.split(" ")
	var l = null;
	switch(tup[0]){
		case 'get':
			var key = tup[1]
			var obj = store[key]
			if(obj){
				response = "VALUE "+ obj.key+" " + obj.flag+" "  + obj.data.length + "\r\n"
				response += obj.data
				response += crlf
				response += "END"
				response += crlf
			}
			else
				response = error_replies[1]+crlf
			break;
		case 'delete':
			var key = tup[1]
			delete store[key]
			response = "DELETED"+crlf
			break;
		case 'add':
			l = store[obj.key] ? parseFloat(store[obj.key].data) : 0;
			l = isNaN(l) ? 0 : l
		case 'incr':
			if(l===null) l =1;
		case 'decr':
			if(l===null) l =-1;
			console.log(tup,l);
			var obj = {key: tup[1], flag: tup[2]}
			var val = store[obj.key] ? parseFloat(store[obj.key].data) : 0
			obj.data =  (isNaN(val) ? 0:val) + l ;
			store[obj.key] = obj
			response = "STORED"+crlf
			break;
		case 'set':
			var obj = {key: tup[1], flag: tup[2], data: body}
			store[obj.key] = obj
			response = "STORED"+crlf
			break;
		default:
			response = error_replies[0]+crlf
			break;
	}
	socket.write(response,"binary",call_back)
}

var server = tcp.createServer(function (socket) {
	console.log("client: ",socket.remoteAddress)
    var user_state = 'reading_header'
    var buf = ""
    var header =""
    var body = ""
    var expect_body_len = 0 
    var CRLF_LEN = 2
    socket.setEncoding("binary")
 	socket.on('data',function(data){
 		buf += data
 		socket.emit('user_event')
 	})
 	socket.on('user_event',function(){
 		switch(user_state){
 			case "reading_header":
 				var pos =-1
		 		if((pos=buf.indexOf(crlf))!=-1){
		 			header = buf.slice(0,pos)
		 			buf = buf.slice(pos+crlf_len)
		 			CRLF_LEN =2
		 		}
		 		else if((pos=buf.indexOf('\n'))!=-1){
		 			header = buf.slice(0,pos)
		 			buf = buf.slice(pos+1)
		 			CRLF_LEN =1
		 		}
		 		if(pos!=-1){
		 			user_state = 'reading_body'
		 			expect_body_len = handle_header(header,CRLF_LEN)
			 		socket.emit("user_event")
			 	}
 				break
 			case "reading_body":
 				if(expect_body_len <= buf.length){
 					body = buf.slice(0,expect_body_len-CRLF_LEN)
 					buf = buf.slice(expect_body_len)
 					handle_body(socket,header,body,
 						function(){
 							user_state = 'reading_header'
 							if(buf.length>0)
 								socket.emit("user_event")
 						}
 					)
 					
 				}
 				break
 		}
 	})
});
//var port = 11211
//console.log("listening at "+ port)
//server.listen(port, '0.0.0.0')
if (process.platform === 'win32') 
  exports.PIPE = '\\\\.\\pipe\\memory-sock';
else {
  	exports.PIPE = path.resolve(os.tmpdir() , 'memory.sock');
   	try{
	   	if (require('fs').existsSync(exports.PIPE))
	    	require('fs').unlinkSync(exports.PIPE);
	}catch(e){}
}
var settings = require(path.resolve(__dirname,"settings.json"));

exports.PIPE = parseInt(settings.httpPort || 13014)+10;

exports.server = function(){
	server.listen(exports.PIPE );
	console.log("Memory server start ",exports.PIPE);	
};



var Client = exports.Client = function(scope) {
    this.pipe = exports.PIPE;
    this.buffer = "";
    this.scope = scope ? scope +"::" : "";
    this.conn = null;
    this.sends = 0;
    this.replies = 0;
    this.callbacks = [];
    this.handles = [];
};

util.inherits(Client, emitter);

Client.prototype.connect = function () {
	if (!this.conn) {
	    this.conn = new tcp.createConnection(this.pipe);
		var self = this;
	    this.conn.addListener("connect", function () {
	        this.setTimeout(0);          // try to stay connected.
	        this.setNoDelay();
		  	self.emit("connect");
	  		self.dispatchHandles();
	    });

	    this.conn.addListener("data", function (data) {
	    	self.buffer += data;
            // util.debug(data);
	    	self.recieves += 1;
	    	self.handle_received_data();
	    });

	    this.conn.addListener("end", function () {
	    	if (self.conn && self.conn.readyState) {
	    		self.conn.end();
	        	self.conn = null;
	      	}
	    });

	    this.conn.addListener("close", function () {
	    	self.conn = null;
	      	self.emit("close");
	    });

            this.conn.addListener("timeout", function () {
                self.conn = null;
                self.emit("timeout");
            });

            this.conn.addListener("error", function (ex) {
                self.conn = null;
                self.emit("error", ex);
            });
    }
};

Client.prototype.addHandler = function(callback) {
    this.handles.push(callback);

    if (this.conn.readyState == 'open') {
        this.dispatchHandles();
    }
};

Client.prototype.dispatchHandles = function() {
    for (var i in this.handles) {
        var handle = this.handles.shift();
        // util.debug('dispatching handle ' + handle);
        if (typeof handle !== 'undefined') {
            handle();
        }
    }
};

Client.prototype.query = function(query, type, callback) {
	this.callbacks.push({ type: type, fun: callback });
	this.sends++;
	this.conn.write(query + crlf);
};

Client.prototype.close = function() {
	if (this.conn && this.conn.readyState === "open") {
		this.conn.end();
		this.conn = null;
	}
};

Client.prototype.get = function(key, callback) {
	return this.query('get ' + this.scope+key, 'get', callback);
};


// all of these store ops (everything bu "cas") have the same format
Client.prototype.set     = function(key, value, callback, lifetime, flags) { return this.store('set',     key, value, callback, lifetime, flags); }
Client.prototype.add     = function(key, value, callback, lifetime, flags) { return this.store('add',     key, value, callback, lifetime, flags); }
Client.prototype.replace = function(key, value, callback, lifetime, flags) { return this.store('replace', key, value, callback, lifetime, flags); }
Client.prototype.append  = function(key, value, callback, lifetime, flags) { return this.store('append',  key, value, callback, lifetime, flags); }
Client.prototype.prepend = function(key, value, callback, lifetime, flags) { return this.store('prepend', key, value, callback, lifetime, flags); }
Client.prototype.store   = function(cmd, key, value, callback, lifetime, flags) {

	if (typeof(callback) != 'function') {
		lifetime = callback;
		callback = null;
	}

	var set_flags = flags || 0;
	var exp_time  = lifetime || 0;
    var tml_buf = new Buffer(value.toString());
	var value_len = tml_buf.length || 0;
	var query = [cmd, this.scope+key, set_flags, exp_time, value_len];

	return this.query(query.join(' ') + crlf + value, 'simple', callback);
};

Client.prototype.delete = function(key, callback){
	return this.query('delete ' + this.scope+key, 'simple', callback);
};


Client.prototype.increment = function(key, value, callback) {

	if (typeof(value) == 'function') {
		callback = value;
		value = 1;;
	}

	value = value || 1;
	return this.query('incr ' + this.scope+key + ' ' + value, 'simple', callback);
};

Client.prototype.decrement = function(key, value, callback) {

	if (typeof(value) == 'function') {
		callback = value;
		value = 1;;
	}

	value = value || 1;
	return this.query('decr ' + this.scope+key + ' ' + value, 'simple', callback);
};

Client.prototype.handle_received_data = function(){

	while (this.buffer.length > 0){

		var result = this.determine_reply_handler(this.buffer);

		if (result == null){
			break;
		}

		var result_value = result[0];
		var next_result_at = result[1];
		var result_error = result[2];

		// does the current message need more data than we have?
		// (this is how "get" ops ensure we've gotten all the data)
		if (next_result_at > this.buffer.length){
			break;
		}

		this.buffer = this.buffer.substring(next_result_at);

		var callback = this.callbacks.shift();
		if (callback != null && callback.fun){
			this.replies++;
			callback.fun(result_error, result_value);
		}
	}
};

Client.prototype.determine_reply_handler = function (buffer){

	// check we have a whole line in the buffer
	var crlf_at = buffer.indexOf(crlf);
	if (crlf_at == -1){
		return null;
	}

	// determine errors
	for (var error_idx in error_replies){
		var error_indicator = error_replies[error_idx];
		if (buffer.indexOf(error_indicator) == 0) {
			return this.handle_error(buffer);
		}
	}

	// call the handler for the current message type
	var type = this.callbacks[0].type;
	if (type){
		return this['handle_' + type](buffer);
	}

	return null;
};

Client.prototype.handle_get = function(buffer) {
    var next_result_at = 0;
    var result_value = null;
    var end_indicator_len = 3;
    var result_len = 0;

    if (buffer.indexOf('END') == 0) {
        return [result_value, end_indicator_len + crlf_len];
    } else if (buffer.indexOf('VALUE') == 0 && buffer.indexOf('END') != -1) {
        first_line_len = buffer.indexOf(crlf) + crlf_len;
        var end_indicator_start = buffer.indexOf('END');
        result_len = end_indicator_start - first_line_len - crlf_len;
        result_value = buffer.substr(first_line_len, result_len);
        return [result_value, first_line_len + parseInt(result_len, 10) + crlf_len + end_indicator_len + crlf_len]
    } else {
        var first_line_len = buffer.indexOf(crlf) + crlf_len;
        var result_len     = buffer.substr(0, first_line_len).split(' ')[3];
        result_value       = buffer.substr(first_line_len, result_len);

        return [result_value, first_line_len + parseInt(result_len ) + crlf_len + end_indicator_len + crlf_len];
    }
};


Client.prototype.handle_simple = function(buffer){
	var line = readLine(buffer);
	return [line, (line.length + crlf_len), null];
};

Client.prototype.handle_error = function(buffer){
	var line = readLine(buffer);
	return [null, (line.length + crlf_len), line];
};

readLine = function(string){
	var line_len = string.indexOf(crlf);
	return string.substr(0, line_len);
};