var Properties = {
	"kannel.js":{
		host : { type : String, label : "Kannel Host", help : "Defaut : 127.0.0.1", default : "127.0.0.1" },
		port : { type: String  , label : "Kannel Port", help : "Defaut : 13001", default : 13001},
		id :     { type: String, label : "Identifiant de la smsbox", help : "Defaut : LoveIsMyReligion", default : "LoveIsMyReligion" },
		tls : {type : Boolean, label :'Secure',default:  false, inputType : 'checkbox'}
	},
	"shorty.js" : {
        "mode" : {type : String, label :"Mode",default:"transceiver", help : "Defaut : transceiver"},
        "host" : { type : String, label : "Host", help : "Defaut : 127.0.0.1", default : "127.0.0.1" },
		"port" : { type: String  , label : "Port", help : "Defaut : 2775", default : 2775},
		"system_id":    { type: String, label : "Identifiant", help : "Defaut : username", default : "username" },
		"password":     { type: String, label : "Password", help : "Defaut : password", default : "password" },
        "system_type":  { type: String, label : "Type", help : "Defaut : SMPP", default : "SMPP" },
        "addr_ton":     { type: Number, label : "TON", help : "Defaut : 0", default : "0" },
        "addr_npi":     { type: Number, label : "NPI", help : "Defaut : 1", default : 1 },
        "addr_range":   { type: String, label : "RANGE", help : "Defaut : **Empty**", default : "" },
        "timeout":      { type: Number, label : "Timeout", help : "Defaut : 30", default : 30 },
        "client_keepalive":  {type : Boolean, label :'Keepalive',default:  false, inputType : 'checkbox'},
        "client_reconnect_interval": { type: Number, label : "Reconnection", help : "Defaut : 2500", default : 2500 },
        "strict":       {type : Boolean, label :'Strict',default:  true, inputType : 'checkbox'}
    },
    "smpp.js" : {
    	"host" : { type : String, label : "Host", help : "Defaut : 127.0.0.1", default : "127.0.0.1" },
		"port" : { type: String  , label : "Port", help : "Defaut : 2775", default : 2775},
		"system_id":    { type: String, label : "Identifiant", help : "Defaut : username", default : "username" },
		"password":     { type: String, label : "Password", help : "Defaut : password", default : "password" }
    }
}
module.exports = function(app,dir){
	var hidden = {id:1,conf : 1,},
		readOnly={id:1,name:1},
		liens = {
			"connector.list" : "Liste des Connectors"
		};
	app.route(/^\/connector\.json(\/([^\/]+)?)?$/i)
		.get(function(req,res,next){
			var id = req.params[1] || false;
			Models.Connector[ id ? 'findById' : 'find' ](id? id : {},function(err,connectors){
				if(err || !connectors)
					return res.json({success:false, message : err.message});

				res.json({success : true, data: (connectors.length ? connectors.map(function(item){  return { value : item.num , text: "["+item.num + "] " +item.desc}}) : connectors),message:"Requete Ok"})
			})
		})
	app.route("/connector.list")
		.get(function(req,res,next){
			if(! ("connector" in req.user.droits)){
				res.status(403);
				return res.render("page-error",{error : {code:403, message : "Acces interdit"}});
			}
			
			var heads = {}, checkbox = {}, listes = {}, listValues = {};
			for(var i in Models.Connector.properties){
				if(Models.Connector.properties[i].label)
					heads[i] = Models.Connector.properties[i].label;
				if(Models.Connector.properties[i].inputType == 'checkbox')
					checkbox[i] = 1;
				else if(Models.Connector.properties[i].list)
					listes[i] = Models.Connector.properties[i].list;
				else if(Models.Connector.properties[i].data)
					listValues[i] = Models.Connector.properties[i].data;
			}
			
			Models.Connector.find({},function(err,items){
				if(err)
					return next(err);
				res.render("build-resposive-table",{ hidden : hidden, listValues : listValues,fields : heads,title:"Liste des connectors",data : items, checkboxs : checkbox, listes : listes,getActions : function(j,user){
					if(!(j.name in VMs))
						initVMs(j);
					return (VMs[j.name].online ?
							'<a title="Stop server" href="'+dir+'/connector.stop/'+j.name+'" class="btn btn-dark btn-sm"><i class="fa fa-stop"></i>  Stop Server</a>  ' :
							'<a title="Start server" href="'+dir+'/connector.start/'+j.name+'" class="btn btn-success btn-sm"><i class="fa fa-play"></i>  Start Server</a>  ' 
						)+
						'<a title="Edit" href="'+dir+'/connector.info/'+j.id+'" class="btn btn-blue btn-sm"><i class="fa fa-edit"></i></a>  '+
				    	'<a id="user-remove-'+j.id+'" title="Effacer" href="javascript:exec(\'/admin/connector.remove/'+j.id+'\',\'{1}\',\'Error : {1}\',\'#user-remove-'+j.id+'\')" class="btn btn-red btn-sm"><i class="fa fa-trash-o"></i></a>';
				}  });
			})
		})
	app.get(/^\/connector.stop\/(.*)$/i,function(req,res){
		if(! ("connector" in req.user.droits)){
			res.status(403);
			return res.render("page-error",{error : {code:403, message : "Acces interdit"}});
		}
		if(!(req.params[0] && req.params[0] in VMs)){
			res.status(404);
			return res.render("page-error",{error : {code:404, message : "VM not Found"}});
		}
		VMs[req.params[0]].send("stop");
		return res.redirect(dir+"/connector.list");
	});
	app.get(/^\/connector.start\/(.*)$/i,function(req,res){
		if(! ("connector" in req.user.droits)){
			res.status(403);
			return res.render("page-error",{error : {code:403, message : "Acces interdit"}});
		}
		if(!(req.params[0] && req.params[0] in VMs)){
			res.status(404);
			return res.render("page-error",{error : {code:404, message : "VM not Found"}});
		}
		
		VMs[req.params[0]].send({type:"start",data:VMs[req.params[0]].item.conf});
		return res.redirect(dir+"/connector.list");
	    
	});
	app.route("/connector.add")
		.all(function(req,res,next){
			if(!("connector" in req.user.droits))
				return res.redirect(dir+"/connector.list");
			next();
		})
		.get(function(req,res){
			var update = {},
				hidden = {id:1,conf:1};
			for(var cle in Models.Connector.properties){
				if(readOnly[cle] || (!req.user.isAdmin && Models.Connector[cle] && Models.Connector[cle].needAdmin) )
					continue;
				if(Models.Connector.properties[cle].default)
					update[cle] = Models.Connector.properties[cle].default;
			}
			res.render("build-form",{hidden:hidden,readOnly:{id:1},fields : Models.Connector.properties,title:"Ajouter un connector",data : update});
		}).post(function(req,res,next){
			var readOnly = {id:1},
				update = {
				};
			for(var cle in Models.Connector.properties){
				if(readOnly[cle] || (!req.user.isAdmin && Models.Connector[cle] && Models.Connector[cle].needAdmin) )
					continue;
				if(Models.Connector.properties[cle].type == Boolean)
					update[cle] = false;
				if( req.body[cle] ){
					if(Models.Connector.properties[cle].type == Boolean)
						update[cle] = (req.body[cle] == 'true' || req.body[cle] == 'on' || req.body[cle] == 1);
					else
						if(Models.Connector.properties[cle].data){
							var tmp = {};
							for(var i in Models.Connector.properties[cle].data)
								if(req.body[cle] && req.body[cle].indexOf &&	req.body[cle].indexOf(i) != -1 )
									tmp[i] = 1;
							update[cle] = tmp;

						}else
							update[cle] = req.body[cle]
				}
			}
			Models.Connector.findOne({ where : {name : update.name }}, function(err,connector){
				if(err)
					return next(err);
				if(connector){
					res.status(403);
					return res.render("page-error",{error : {code:403, message : "Le Connector "+req.body.name+" Existe deja"}});	
				}
				new Models.Connector(update).save(function(err,connector){
					if(err)
						return next(err);
					initVMs(connector);
					res.redirect(dir+"/connector.info/"+connector.id);
				})
			});
		})
		app.route(/^\/connector\.info\/([^\/]+)?$/i)
		.all(function(req,res,next){
			if(!("connector" in req.user.droits))
				return req.redirect(dir+"/connector.list");
			next();
		})
		.get(function(req,res,next){
			var id = req.params[0] || false;
			if(!id)
				return req.redirect(dir+"/connector.list");
			Models.Connector.findById(id, function(err, connector){
				if(err)
					return next(err);
				if(connector){
					var update = {},
						hidden = {};
					var properties = Properties[connector.type];
					if(!properties){
						res.status(403);
						return res.render("page-error",{error:{ code:404, message:"Connecteur invalide!!!"}});
					}
					var readOnly = {};
					var data = connector.conf || {};
					for(var cle in properties){
						if((properties[cle] && properties[cle].readOnly) || (!req.user.isAdmin && properties[cle] && properties[cle].needAdmin) )
							readOnly[cle] = 1;
						else
							if(properties[cle] && properties[cle].hidden)
								hidden[cle] = 1;

						if(properties[cle].default)
							data[cle] == data[cle] || properties[cle].default;
					}
					res.render("build-form",{liens:liens,hidden : hidden,readOnly : readOnly,fields : properties,title:"Configurer le Connector : "+connector.name,data : data});
				}else
					res.redirect(dir+"/connector.list");
			});
		}).post(function(req,res,next){
			var id = req.params[0] || false;
			if(!id)
				return req.redirect(dir+"/connector.list")
			var readOnly = {},
				update = {id:id};
			Models.Connector.findById(update.id  , function(err,connector){
				if(err)
					return next(err);
				if(!connector){
					res.status(404);
					return res.render("page-error",{error:{ code:404, message:"Connector Not found"}});
				}
				var properties = Properties[connector.type];
					if(!properties){
						res.status(403);
						return res.render("page-error",{error:{ code:404, message:"Connector invalide!!!"}});
					}
				for(var cle in properties){
					if(readOnly[cle] || (!req.user.isAdmin && properties[cle] && properties[cle].needAdmin) ){
						update[cle] = connector.conf[cle] || properties[cle].default;
						continue;
					}
					if(properties[cle].default && !req.body[cle])
						req.body[cle] = properties[cle].default;
					if(properties[cle].type == Boolean)
						update[cle] = properties[cle].default ? properties[cle].default : false;
					if( req.body[cle] ){
						if(properties[cle].type == Boolean)
							update[cle] = (req.body[cle] == 'true' || req.body[cle] == 'on' || req.body[cle] == 1);
						else
							if(properties[cle].data){
								var tmp = {};
								for(var i in properties[cle].data)
									if(req.body[cle] && req.body[cle].indexOf &&	req.body[cle].indexOf(i) != -1 )
										tmp[i] = 1;
								update[cle] = tmp;

							}else
								update[cle] = req.body[cle];
					}
				}
				var conf = {}
				for(var cle in update)
					conf[cle]  = update[cle];
				connector.conf = conf;
				connector.save(function(err,connector){
					if(err)
						return next(err);
					if(connector.name in VMs)
						VMs[connector.name].item = connector;
					else
						initVMs(connector);
					res.redirect(dir+"/connector.info/"+connector.id);
				})
			});
		});
		app.route(/^\/connector\.remove\/([^\/]+)$/i)
		.all(function(req,res,next){
			if(!("connector" in req.user.droits))
				return req.redirect(dir+"/connector.list");
			next();
		})
		.get(function(req,res,next){
			var id = req.params[0] || false;
			if(!id)
				return req.redirect(dir+"/connector.list");
			Models.Connector.findById(id, function(err,connector){
				if(err)
					return next(err);
				if(!connector){
					res.status(404);
					return res.render("page-error",{error:{ code:404, message:"Connector Not found"}});
				}
				Models.Connector.remove({where : {id : req.params[0] }},function(err){
					if(err)
						return next(err);
					console.log(arguments);
					if(connector.name in VMs)
						try{
							VMs[connector.name].kill();
							delete VMs[connector.name];
						}catch(e){}
					res.json({success : true, message : 'Connector effacé'});
				});
			});
		});
}

