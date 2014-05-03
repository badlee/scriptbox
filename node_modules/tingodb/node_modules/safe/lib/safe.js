(function () {

var safe={};

safe.result = function (callback,fn) {
	if (fn == undefined)
		throw new Error("Exactly two arguments are required")
	return function () {
		var result; 
		try {		
			result = fn.apply(this, arguments);
		} catch (err) {
			return back(callback,err);
		}
		if (result != undefined)
			back(callback,null, result);
		else
			back(callback,null);
	}
}

safe.sure = safe.trap_sure = function (callback,fn) {
	if (fn == undefined)
		throw new Error("Exactly two arguments are required")
	return function () {
		if (arguments[0])
			return callback(arguments[0])
		if (typeof(fn) != "function")			
			return callback(null,fn);		
		try {
			fn.apply(this, Array.prototype.slice.call(arguments,1));
		}
		catch (err) {
			callback(err);
		}
	}	
}

safe.trap = function (callback,fn) {
	return function () {
		if (fn == undefined) {
			fn = callback;
			callback = arguments[arguments.length-1];
		}
		try {
			fn.apply(this, arguments);
		}
		catch (err) {
			back(callback,err);
		}
	}
}

safe.wrap = function (fn,callback) {
	if (callback == undefined)
		throw new Error("Exactly two arguments are required")	
	return function () {
		var args = Array.prototype.slice.call(arguments)
		args.push(callback);
		try {
			fn.apply(this, args);
		}
		catch (err) {
			back(callback,err);
		}
	}
}

safe.run = function (fn,cb) {
	try {
		fn.apply(this, [cb])
	} catch (err) {
		back(cb, err) 
	}
}

var later = (typeof setImmediate === "undefined")? (typeof process === "undefined" ? function (cb) {setTimeout(cb,0)} : process.nextTick):setImmediate;

function back() {
    var cb = arguments[0];
    var args = 	Array.prototype.slice.call(arguments,1,arguments.length);
    later(function () {
		cb.apply(this,args)
    })
}
safe.back = back;

safe.noop = function () {}

safe.yield = later;

safe.sure_result = safe.trap_sure_result = function (callback, fn) {
	if (fn == undefined)
		throw new Error("Exactly two arguments are required")
	return function () {
		if (arguments[0])
			return callback(arguments[0])
		var result;
		try {
			result = fn.apply(this, Array.prototype.slice.call(arguments,1));
		}
		catch (err) {
			return callback(err);
		}
		if (result != undefined)
			callback(null, result);
		else
			callback(null);
	}	
}

safe.sure_spread = function (callback, fn) {
	if (fn == undefined)
		throw new Error("Exactly two arguments are required")
	return function () {
		if (fn == undefined) {
			fn = callback;
			callback = arguments[arguments.length-1];
		}
		if (arguments[0])
			return callback(arguments[0])
		try {
			result = fn.apply(this, arguments[1]);
		}
		catch (err) {
			callback(err);
		}
	}	
}

safe.async = function () {
	var this_ = arguments[0];
	var f_ = arguments[1];
	var args = Array.prototype.slice.call(arguments,2)
	return function (cb) {
		try {
			args.push(cb);
			this_[f_].apply(this_,args);
		} catch (err) {
			cb(err);
		}
	}
}

safe.spread = function (fn) {
	return function (arr) {
		fn.apply(this,arr)
	}
}

safe.inherits = (function(){
    function noop(){}
 
    function ecma3(ctor, superCtor) {
        noop.prototype = superCtor.prototype;
        ctor.prototype = new noop;
        ctor.prototype.constructor = superCtor;
    }
    
    function ecma5(ctor, superCtor) {
        ctor.prototype = Object.create(superCtor.prototype, {
            constructor: { value: ctor, enumerable: false }
        });
    }
    
    return Object.create ? ecma5 : ecma3;
}());

if (typeof module !== 'undefined' && module.exports)
	// commonjs module
	module.exports = safe;
else if (typeof define !== 'undefined' && define.amd )
	// AMD module
	define([],function () {
		return safe;
	})
else
	// finally old school 
	this.safe =safe;

})();
