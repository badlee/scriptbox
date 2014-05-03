var MSG = require('kannel').MSG;
var path = require('path'),
    fs = require('fs'),
    md5 = require('MD5');
var propertiesSMS = { 
		id : { type : Number, label : "Identifiant", index : true },
		pdu: { type: MSG  },
		from: { type: String,  limit: 50 , label : "Sender"},
		to: { type: String,  limit: 50 , label : "Receiver"},
		MotCle: { type: String , label : "Mot Cle"},
		SMSC: { type: String , label : "SMSC"},
		time: { type: Number,    default: Date.now , label : "Date"},
		success : { type: Boolean, default: false , label : "Success"}
	},
	propertiesExpressions = {
		id : { type : Number, label : "Identifiant", index : true },
		name: { type: String  , label : "Nom"},
		expression:     { type: String, label : "Validateur" },
		options:     { type: String, label : "Options", list : { "": "", "i":"i","g":"g","m":"m","ig":"ig","im":"im","gm":"gm","igm":"igm"} },
	},
	propertiesMotCle = {
		id : { type : Number, label : "Identifiant", index : true },
		keyword:         { type: String  , label : "Mot cle"},
		"scriptId-val" : {type : String},
		scriptId:     { type: Number, label : "Script" , dataUrl : '/admin/script.json', saveValue : true},
		"validator-val" : {type : String}, 
		validator:     { type: Number, label : "Validateur  SMS" , dataUrl : '/admin/expression.json', saveValue : true},
		"blackList-val" : {type : String},
		blackList:     { type: Number, label : "Reject Sender" , dataUrl : '/admin/expression.json', saveValue : true},
		rewriter:     { type: String, label : "Regle de reecriture" },
		user : { type : Number }
	},
	propertiesScript = {
		id : { type : Number, label : "Identifiant", index : true },
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
	
	Expression.validatesUniquenessOf('name', {message: 'name is not unique'});
	Script.validatesUniquenessOf('name', {message: 'name is not unique'});
	MotCle.validatesUniquenessOf('keyword', {message: 'keyword is not unique'});

	SMS.properties = propertiesSMS;
	Expression.properties = propertiesExpressions;
	Script.properties = propertiesScript;
	MotCle.properties = propertiesMotCle;
	
	MotCle.beforeSave = function(next){
		var data = JSON.stringify(this);
		//console.log("beforeSave",arguments);
		var name = path.join(__DIR,"scripts","keywords", md5(this.keyword.toLowerCase()));
		//console.log("beforeSave",data, name);
		fs.writeFile(name, data, function (err) {
		  	if (err)
		  		next(err);
		  	next();
		});
	};
	Expression.afterSave = function (next) {
		var self = this;
	    MotCle.find({
	    	validator: this.id
	    },function(err, items){
	    	items.forEach(function(item){
	    		item.updateAttribute("validator-val",(self.expression || "")+"[:ø:]"+(self.options || ""), new Function) /*TODO*/
 	    	});

	    });
	    MotCle.find({
	    	blackList: this.id
	    },function(err, items){
	    	items.forEach(function(item){
	    		item.updateAttribute("blackList-val",(self.expression || "")+"[:ø:]"+(self.options || ""),new Function) /*TODO*/
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
	}

	Models.SMS = SMS;
	Models.Expression = Expression;
	Models.Script = Script;
	Models.MotCle = MotCle;
}
