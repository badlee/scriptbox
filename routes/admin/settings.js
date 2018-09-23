var path = require('path'),
	fs = require('fs'),
	osHomedir = require('os').homedir(),
	package = require("../../package.json"),
	altSettings = path.resolve(osHomedir,"."+package.name+".json");

module.exports = function(app){
	var adapter = {
			arango : 	["ArangoDB","arango"],
			firebird : 	["firebird" ,"node-firebird"],
			mongodb : 	["MongoDB","mongodb"],
			mongoose : 	["MongoDB(Mongoose)","mongoose"],
			mysql : 	["MySql","mysql"],
			nano : 		["Nano","nano"],
			neo4j : 	["Neo4J","neo4j"],
			postgres : 	["PostgresSQL","pg"],
			redis : 	["Redis" ,"redis"],
			rethinkdb : ["RethinkDB","rethinkdb"],
			riak : 		["Riak","riak-js"],
			sqlite3 : 	["Sqlite","sqlite3"],
			tingodb : 	["TingoDB", "tingodb"]
	}
	var fields = {
		title : 			{label : "Nom du site web" , default : "Oshimin SMS"},
		defaultPwd : 		{label : "Mot de passe par defaut", default : "azerty"},
		defaultActif : 		{label : "Utilisateur Actif par defaut", type : Boolean, inputType : 'checkbox'},
		defautErrorMSG : 	{label : "SMS d'erreur par defaut", default : "ERREUR"},
		defaultDroits : 	{label :'Droits Utilisateur par defaut'},
		httpPort : 			{label :'Port Http', default : 13014},
		dbType : 			{label : "storage Type", list : {memory: "Memory"}},
		dbHost : 			{label : "Serveur de base de donnée"},
		dbPort : 			{label : "Port du serveur de BD"},
		dbUser : 			{label : 'Utilisateur de la BD'},
		dbPwd  : 			{label  : "Mot de passe de Connexion à la BD" },
		dbPath : 			{label  : "Nom de la base de donnée" },
		dbPool : 			{label  : "Connexion Pool à la BD", type : Boolean, inputType : 'checkbox' },
		dbSSL : 			{label  : "Connexion SSL/TLS à la BD", type : Boolean, inputType : 'checkbox' },
		dbProdType : 		{label : "storage Type [DB Prod]", list : {memory: "Memory"}},
		dbProdHost : 		{label : "Serveur de base de donnée [DB Prod]"},
		dbProdPort : 		{label : "Port du serveur de BD [DB Prod]"},
		dbProdUser : 		{label : "Utilisateur de la BD [DB Prod]"},
		dbProdPwd  : 		{label : "Mot de passe de Connexion à la BD [DB Prod]" },
		dbProdPath : 		{label : "Nom de la base de donnée [DB Prod]" },
		dbProdPool : 		{label : "Connexion Pool à la BD [DB Prod]", type : Boolean, inputType : 'checkbox' },
		dbProdSSL : 		{label  : "Connexion SSL/TLS à la BD [DB Prod]", type : Boolean, inputType : 'checkbox' },
	};

	for(var i in adapter){
		try {
    		require.resolve(adapter[i][1]);
    		fields.dbType.list[i] = adapter[i][0];
    		fields.dbProdType.list[i] = adapter[i][0];
		} catch(e){}
	}
	
	fields.defaultDroits.data = Models.user.properties.droits.data;
	app.route("/settings.json")
		.all(function(req,res,next){
			if(!req.user.isAdmin){
				res.status(403);
				return res.render("page-error",{error : {code:403, message : "Acces interdit"}});
			}
			next();
		})
		.get(function(req,res){
			require("../../settings");
			for(var cle in fields)
				if(!settings[cle] && "default" in fields[cle])
					settings[cle] = fields[cle].default;
			res.render("build-form",{readOnly:{},fields : fields,title:"Application Settings",data : settings});
		})
		.post(function(req,res,next){			
			var readOnly = {},
				update = {};
			for(var cle in fields){
				if(readOnly[cle])
					continue;
				if(fields[cle].type == Boolean)
					update[cle] = false;
				
				if(fields[cle].type == Boolean)
					update[cle] = (req.body[cle] == 'true' || req.body[cle] == 'on' || req.body[cle] == 1);
				else
					if(fields[cle].data){
						var tmp = {};
						for(var i in fields[cle].data)
							if(req.body[cle] && req.body[cle].indexOf &&	req.body[cle].indexOf(i) != -1 )
								tmp[i] = 1;
						update[cle] = tmp;

					}else
						update[cle] = req.body[cle]
				
			}
			for(var cle in fields)
				if(!update[cle] && "default" in fields[cle])
					update[cle] = fields[cle].default;
			for(var cle in update)
				settings[cle] = update[cle];
			settings.maxPool = settings.maxPool < 1 ? 1 : Number(settings.maxPool);

			fs.writeFile(altSettings, JSON.stringify(settings,null,4), function (err) {
			  if (err) next(err);
			  
			if(!settings.defaultPwd)
					settings.defaultPwd = "azerty";
				
			if(!settings.title)
				settings.title = "Oshimin SMS";
			  res.render("build-form",{readOnly:{},fields : fields,title:"Application Settings",data : settings});
			});

		});
}

