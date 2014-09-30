var properties = { 
		//id : { type : Number, label : "Identifiant", index : true },
		email:         { type: String,  limit: 255, index: true, label : "Email"  },
		username:         { type: String,  limit: 255, index: true , label : "Login"  },
		salt:       { type: String,  limit: 32 },
		password:     { type: String,  limit: 255, default : settings.defaultPwd || "azerty" },
		smsPWD : { type: String,  limit: 255, default : settings.defaultPwd || "azerty" , label:"Mot de passe pour l'envoi des SMS"},
		telephone:       { type: String,  limit: 255, default : "", label : "Telephone" , mask : "(999) 99 99 99 99"},
		gender : { type: String,  limit: 6, default : "male" , label : "Genre", list : {"male":"Homme","female":"Femme" } },
		isAdmin : { type: Boolean, default: false, index: true, label : "Administrateur", needAdmin : true, inputType : 'checkbox' },
		actif:     { type: Boolean, default: settings.defaultActif || false, index: true ,  label : "Actif", needAdmin : true, inputType : 'checkbox' },
		joinedAt:   { type: Number,    default: Date.now },
		theme : { type: String,  limit: 20, default : "default" },
		init : { type: Boolean, default: false },
		droits : {type : Object, default : settings.defaultDroits || {}, needAdmin : true, label :'Droits', data : {
			sendsms: "Envoyer un sms",
			scripting: "Gestion des script",
			keywording : "Gestion des Service SMS",
			expression : "Gestion des Expression",
			shortnumber : "Gestion des Numeros Courts",
			connector : "Gestion des Connecteurs"
		} },
		todo : {type : Array, default : []}
	},
	md5 = require('MD5'),
	rnd = require("randomstring");
var env = process.env.NODE_ENV || 'dev';
module.exports = function(schema){
	
	var User = schema.define('User', properties);
	User.beforeCreate = function(next){
		console.log("beforeCreate",this.username,this.password);
		this.salt = rnd.generate(Math.floor( 32*Math.random()+10));
		this.password = md5(this.salt+"|"+this.password);
		if(next)
			next();
	};
	User.prototype.setPWD = function(pwd,callback){
			this.salt = rnd.generate(Math.floor( 32*Math.random()+10));
			this.password = md5(this.salt+"|"+(pwd || settings.defaultPwd || "azerty"));
			this.save((callback || new Function).bind(this));
	};
	User.prototype.randomPWD = function(callback){
			this.salt = rnd.generate(Math.floor( 32*Math.random()+10));
			var pwd = rnd.generate(Math.floor( 8*Math.random()+7));
			this.password = md5(this.salt+"|"+(pwd || "azerty"));
			this.save((callback || new Function).bind(this,pwd));
	};
	User.prototype.authentificate = function (pwd) {
		return (this.password == md5(this.salt+"|"+pwd));
	};
	User.properties = properties;
	User.validatesPresenceOf('email', 'email');
	User.validatesUniquenessOf('email', {message: 'email is not unique'});
	User.validatesInclusionOf('gender', {in: ['male', 'female']});
	User.validatesInclusionOf('actif', {in: [true, false]});
	User.validatesUniquenessOf('username', {message: 'username is not unique'});
	
	if ('dev' == env) {
   		/* sample data */
		/* Utilisateurs */
		var users = [
			{  username: 'bob', password: 'secret', email: 'bob@example.com', actif : true, gender : "female" ,droits : {
		        "scripting": 1,
		        "keywording": 1,
		        "expression": 1,
		        "sendsms": 1,
			"shortnumber" : 1,
			"connector" : 1
		    }}
		  , {  username: 'joe', password: 'secret', email: 'joe@example.com'}
		  , {  username: 'oshimin', password: 'secret', email: 'joe2@example.com', actif : true, theme : "white",isAdmin : true}
		];

		// simplier way to describe model

		for(var i=users.length;i--;) new User(users[i]).save();
	}
	
    Models.user = User;
}
