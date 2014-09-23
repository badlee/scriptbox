var MSG = require('kannel').MSG;
var path = require('path'),
    fs = require('fs'),
    md5 = require('MD5');
var propertiesSMS = { 
		//id : { type : Number, label : "Identifiant", index : true },
		pdu: { type: Object  },
		sms: { type: String,  limit: 50 , label : "Sms"},
		from: { type: String,  limit: 50 , label : "Sender"},
		to: { type: String,  limit: 50 , label : "Receiver"},
		MotCle: { type: String , label : "Mot Cle"},
		SMSC: { type: String , label : "SMSC"},
		time: { type: Number,    default: Date.now , label : "Date"},
		success : { type: Boolean, default: false , label : "Success"},
		received : { type: Boolean, default: true },
		raison: { type: String , label : "Raison", default:""},
	},
	propertiesExpressions = {
		//id : { type : Number, label : "Identifiant", index : true },
		name: { type: String  , label : "Nom"},
		expression:     { type: String, label : "Validateur" },
		opts:     { type: String, label : "Options", list : { "": "No options", "i":"case insensible","g":"global","m":"multiline","ig":"case insensible, global","im":"case insensible, multiline","gm":"global, multiline","igm":"case insensible, global, multiline"} },
	},
	propertiesConnector = {
		//id : { type : Number, label : "ID", index : true },
		name: { type: String  , label : "Identifiant"},
		conf:     { type: Object, label : "Validateur" },
		type: {
			type: String,
			label : "Type",
			list : {
			"kannel.js": "KANNEL",
			"shorty.js":"SMPP 3.4",
			"smpp.js":"SMPP 5.0"
			}
		},
	},
	propertiesShortnumbers = {
		//id : { type : Number, label : "Identifiant", index : true },
		num : { type: String  , label : "Numero Courts"},
		desc :     { type: String, label : "Description" },
	},
	propertiesMotCle = {
		//id : { type : Number, label : "Identifiant", index : true },
		keyword:         { type: String  , label : "Mot cle"},
		"scriptId-val" : {type : String},
		scriptId:     { type: Number, label : "Script" , dataUrl : '/admin/script.json', saveValue : true},
		"validator-val" : {type : String}, 
		validator:     { type: Number, label : "Validateur  SMS" , dataUrl : '/admin/expression.json', saveValue : true},
		"blackList-val" : {type : String},
		blackList:     { type: Number, label : "Reject Sender" , dataUrl : '/admin/expression.json', saveValue : true},
		shortNumbers:     { type: [Object], label : "Numeros Courts" , dataUrl : '/admin/shortnumber.json', saveValue : true, multiple : true},
		user : { type : Number }
	},
	propertiesScript = {
		//id : { type : Number, label : "Identifiant", index : true },
		name: { type: String  , label : "Nom"},
		desc:     { type: String, label : "Description" },
		data:     { type: String, label : "Script" , inputType :"javascript"},
		module : { type: Boolean, default: false, inputType : 'checkbox', label : "Module"  },
		user : { type : Number }
	},
	md5 = require('MD5'),
	rnd = require("randomstring");
var env = process.env.NODE_ENV || 'dev';

module.exports = function(_,schema){
	var SMS = schema.define('SMS', propertiesSMS);
	var Expression = schema.define('Expression', propertiesExpressions);
	var Script = schema.define("Script",propertiesScript);
	var MotCle = schema.define("MotCle",propertiesMotCle);
	var ShortNumber = schema.define("ShortNumber",propertiesShortnumbers);
	var Connector = schema.define("Connector",propertiesConnector);

	Expression.validatesUniquenessOf('name', {message: 'name is not unique'});
	Script.validatesUniquenessOf('name', {message: 'name is not unique'});
	Connector.validatesUniquenessOf('name', {message: 'Name is not unique'});
	ShortNumber.validatesUniquenessOf('num', {message: 'numero is not unique'});

	SMS.properties = propertiesSMS;
	Expression.properties = propertiesExpressions;
	Script.properties = propertiesScript;
	MotCle.properties = propertiesMotCle;
	ShortNumber.properties = propertiesShortnumbers;
	Connector.properties = propertiesConnector;

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
	MotCle.beforeDestroy = function(next){
		console.log("beforeDestroy",arguments);

	}
	SMS.beforeSave = function(next){
		console.log(this);
		delete this.id;
		next();
	}
	MotCle.beforeSave = function(next){
		//console.log("beforeSave",arguments);

		this.shortNumbers = s(this.shortNumbers);
		var name = path.join(__DIR,"scripts","keywords", md5(this.keyword.toLowerCase()));
		fs.readFile(name, (function (err,data) {
		  	//console.log("beforeSave MotCle",arguments);
		  	if (err && err.errno != 34)
		  		return next(err);
		  	if(err && err.errno == 34)
		  		data = "{}";
		  	try{
		  		data = JSON.parse(data);
		  	}catch(e){
		  		return next(e);
		  	}
		  	var a;
		  	if(this.shortNumbers.length)
			  	for(var i =0; i<this.shortNumbers.length;i++){
			  		//console.log("data to save", a = this.shortNumbers[i].toString(), a instanceof Array );
			  		data[this.shortNumbers[i]] = {
			  			"scriptId-val" : this["scriptId-val"],
			  			"validator-val" : this["validator-val"],
			  			"blackList-val" : this["blackList-val"],
			  		};
			  	}
			else
				data['*'] = {
		  			"scriptId-val" : this["scriptId-val"],
		  			"validator-val" : this["validator-val"],
		  			"blackList-val" : this["blackList-val"],
		  		};

		  	data = JSON.stringify(data,true,"    ");
		  	fs.writeFile(name, data, function (err) {
			  	if (err)
			  		next(err);
			  	next();
			});
			//console.log("beforeSave",data, name);
		}).bind(this));
		
	};
	Expression.afterSave = function (next) {
		var self = this;
	    MotCle.find({
	    	validator: this.id
	    },function(err, items){
	    	items.forEach(function(item){
	    		item.updateAttribute("validator-val",(self.expression || "")+"[:ø:]"+(self.opts || ""), new Function) /*TODO*/
 	    	});

	    });
	    MotCle.find({
	    	blackList: this.id
	    },function(err, items){
	    	items.forEach(function(item){
	    		item.updateAttribute("blackList-val",(self.expression || "")+"[:ø:]"+(self.opts || ""),new Function) /*TODO*/
 	    	});
 	    	
	    });
	    // Pass control to the next
	    next();
	};

	if ('dev' == env) {
   		/* sample data */
		/* expression */
		var expression = [
			{ name : "Non", expression : "^[^\\W\\w]*$" }
		  , { name : "Oui", expression : "(?:)" }
		];

		for(var i=expression.length;i--;)
			(new Expression(expression[i])).save();

		/* connector */
		new Connector({
			name: "kannel",
			conf: { 
				host :  "127.0.0.1",
				port : 13001,
				id :   "LoveIsMyReligion",
				tls : false
			},
			type: "kannel.js"
		}).save();
	}

	Models.SMS = SMS;
	Models.Expression = Expression;
	Models.Script = Script;
	Models.MotCle = MotCle;
	Models.Shortnumber = ShortNumber;
	Models.Connector = Connector;
}
