var path = require('path'),
    fs = require('fs'),
    md5 = require('MD5'),
    S = require("string");

module.exports = function(app,dir){
	var hidden = {id:1,data : 1,},
		readOnly={id:1,name:1},
		liens = {
			//"script.list" : "Liste des Script"
		};
	app.route(/^\/script\.json$/i)
		.get(function(req,res,next){
			Models.Script.find({where : {module:false}},function(err,script){
				if(err || !script)
					return res.json({success:false, message : err.message});
				res.json({success : true,data:(script.length ? script.map(function(item){  return {value : item.id , text: item.name, data: item.data} }) : script),message:"Requete Ok"})
			})
		})
	app.route("/script.list")
		.get(function(req,res,next){
			if(! ("scripting" in req.user.droits)){
				res.status(403);
				return res.render("page-error",{error : {code:403, message : "Acces interdit"}});
			}
			
			var heads = {}, checkbox = {}, listes = {}, listValues = {};
			for(var i in Models.Script.properties){
				if(Models.Script.properties[i].label)
					heads[i] = Models.Script.properties[i].label;
				if(Models.Script.properties[i].inputType == 'checkbox')
					checkbox[i] = 1;
				else if(Models.Script.properties[i].list)
					listes[i] = Models.Script.properties[i].list;
				else if(Models.Script.properties[i].data)
					listValues[i] = Models.Script.properties[i].data;
			}
			var hidden = {id:1,data : 1, module : 1};
			Models.Script.find({where: {module : false}},function(err,items){
				if(err)
					return next(err);
				res.render("build-resposive-table",{ hidden : hidden, listValues : listValues,fields : heads,title:"Liste des Script",data : items, checkboxs : checkbox, listes : listes,getActions : function(j,user){
					return '<a title="Edit" href="'+dir+'/script.info/'+j.id+'" class="btn btn-blue btn-sm"><i class="fa fa-edit"></i></a>  '+
				    		'<a id="user-remove-'+j.id+'" title="Effacer" href="javascript:exec(\'/admin/script.remove/'+j.id+'\',\'{1}\',\'Error : {1}\',\'#user-remove-'+j.id+'\')" class="btn btn-red btn-sm"><i class="fa fa-trash-o"></i></a>';
				}  });
			})
		})
	app.route("/module.list")
		.get(function(req,res,next){
			if(! ("scripting" in req.user.droits)){
				res.status(403);
				return res.render("page-error",{error : {code:403, message : "Acces interdit"}});
			}
			
			var heads = {}, checkbox = {}, listes = {}, listValues = {};
			for(var i in Models.Script.properties){
				if(Models.Script.properties[i].label)
					heads[i] = Models.Script.properties[i].label;
				if(Models.Script.properties[i].inputType == 'checkbox')
					checkbox[i] = 1;
				else if(Models.Script.properties[i].list)
					listes[i] = Models.Script.properties[i].list;
				else if(Models.Script.properties[i].data)
					listValues[i] = Models.Script.properties[i].data;
			}
			var hidden = {id:1,data : 1, module : 1};
			Models.Script.find({where: {module : true}},function(err,items){
				if(err)
					return next(err);
				res.render("build-resposive-table",{ hidden : hidden, listValues : listValues,fields : heads,title:"Liste des Modules",data : items, checkboxs : checkbox, listes : listes,getActions : function(j,user){
					return '<a title="Edit" href="'+dir+'/script.info/'+j.id+'" class="btn btn-blue btn-sm"><i class="fa fa-edit"></i></a>  '+
				    		'<a id="user-remove-'+j.id+'" title="Effacer" href="javascript:exec(\'/admin/script.remove/'+j.id+'\',\'{1}\',\'Error : {1}\',\'#user-remove-'+j.id+'\')" class="btn btn-red btn-sm"><i class="fa fa-trash-o"></i></a>';
				}  });
			})
		})
	app.route("/script.module")
		.get(function(req,res,next){
			if(! ("scripting" in req.user.droits)){
				res.status(403);
				return res.render("page-error",{error : {code:403, message : "Acces interdit"}});
			}
			
			var heads = {}, checkbox = {}, listes = {}, listValues = {};
			for(var i in Models.Script.properties){
				if(Models.Script.properties[i].label)
					heads[i] = Models.Script.properties[i].label;
				if(Models.Script.properties[i].inputType == 'checkbox')
					checkbox[i] = 1;
				else if(Models.Script.properties[i].list)
					listes[i] = Models.Script.properties[i].list;
				else if(Models.Script.properties[i].data)
					listValues[i] = Models.Script.properties[i].data;
			}
			
			Models.Script.find({where : { module : true }},function(err,items){
				if(err)
					return next(err);
				res.render("build-resposive-table",{ hidden : hidden, listValues : listValues,fields : heads,title:"Liste des Script",data : items, checkboxs : checkbox, listes : listes,getActions : function(j,user){
					if(j.user != user.id) return "";
					return '<a title="Edit" href="'+dir+'/script.info/'+j.id+'" class="btn btn-blue btn-sm"><i class="fa fa-edit"></i></a>  '+
				    		'<a id="user-remove-'+j.id+'" title="Effacer" href="javascript:exec(\'/admin/script.remove/'+j.id+'\',\'{1}\',\'Error : {1}\',\'#user-remove-'+j.id+'\')" class="btn btn-red btn-sm"><i class="fa fa-trash-o"></i></a>';
				}  });
			})
		})
	app.route("/script.add")
		.all(function(req,res,next){
			if(!("scripting" in req.user.droits))
				return res.redirect(dir+"/script.list");
			next();
		})
		.get(function(req,res){
			var update = {},
				hidden = {id:1};
			for(var cle in Models.Script.properties){
				if(readOnly[cle] || (!req.user.isAdmin && Models.Script[cle] && Models.Script[cle].needAdmin) )
					continue;
				if(Models.Script.properties[cle].default)
					update[cle] = Models.Script.properties[cle].default;
			}
			res.render("build-form",{hidden:hidden,readOnly:{id:1},fields : Models.Script.properties,title:"Ajouter un Script",data : update});
		}).post(function(req,res,next){
			var readOnly = {id:1},
				update = {
					user : req.user.id
				};
			for(var cle in Models.Script.properties){
				if(readOnly[cle] || (!req.user.isAdmin && Models.Script[cle] && Models.Script[cle].needAdmin) )
					continue;
				if(Models.Script.properties[cle].type == Boolean)
					update[cle] = false;
				if( req.body[cle] ){
					if(Models.Script.properties[cle].type == Boolean)
						update[cle] = (req.body[cle] == 'true' || req.body[cle] == 'on' || req.body[cle] == 1);
					else
						if(Models.Script.properties[cle].data){
							var tmp = {};
							for(var i in Models.Script.properties[cle].data)
								if(req.body[cle] && req.body[cle].indexOf &&	req.body[cle].indexOf(i) != -1 )
									tmp[i] = 1;
							update[cle] = tmp;

						}else
							update[cle] = req.body[cle]
				}
			}
			update.name = update.module ? S(update.name).camelize().s : update.name;
			Models.Script.findOne({ where : {name : update.name }}, function(err,script){
				if(err)
					return next(err);
				if(script){
					res.status(403);
					return res.render("page-error",{error : {code:403, message : "Le Script "+req.body.name+" Existe deja"}});	
				}
				// empty update.data before storage
				var data = update.data;
				//update.data = path.join(__DIR,"scripts","services",md5(update.name));
				update.data = path.join(__DIR,"scripts",update.module ? "modules" : "services",update.module ? update.name.split(/[ -]/).join("-").replace(/[^\w\-]+/g,"").toLowerCase() : md5(update.name));
				fs.writeFile(update.data, data, function (err) {
				  	if (err)
				  		next(err);
					new Models.Script(update).save(function(err,script){
						if(err)
							return next(err);
						
						res.redirect(dir+"/script.info/"+script.id);
					})
				});
				
			});
		})
		app.route(/^\/script\.info\/([^\/]+)?$/i)
		.all(function(req,res,next){
			if(!("scripting" in req.user.droits))
				return req.redirect(dir+"/script.list");
			next();
		})
		.get(function(req,res,next){
			var id = req.params[0] || false;
			if(!id)
				return req.redirect(dir+"/script.list");
			Models.Script.findOne({where : {id : id}}, function(err, script){
				if(err)
					return next(err);
				if(script){
					var update = {},
						hidden = {id:1};
					for(var cle in Models.Script.properties){
						if(readOnly[cle] || (!req.user.isAdmin && Models.Script[cle] && Models.Script[cle].needAdmin) )
							continue;
						if(Models.Script.properties[cle].default)
							update[cle] = Models.Script.properties[cle].default;
					}
					fs.readFile(script.data, function (err,data) {
					  	if (err || !data)
					  		next(err ? err : "File not found");
					  	script.data = data.toString();
						res.render("build-form",{liens:liens,hidden : hidden,readOnly : readOnly,fields : Models.Script.properties,title:"Editer le Script",data : script});
					});
				}else
					res.redirect(dir+"/script.list");
			});
		}).post(function(req,res,next){
			var id = req.params[0] || false;
			if(!id)
				return req.redirect(dir+"/script.list")
			var readOnly = {id:1,name:1},
				update = {id:id};
			for(var cle in Models.Script.properties){
				if(readOnly[cle] || (!req.user.isAdmin && Models.Script[cle] && Models.Script[cle].needAdmin) )
					continue;
				if(Models.Script.properties[cle].type == Boolean)
					update[cle] = false;
				if( req.body[cle] ){
					if(Models.Script.properties[cle].type == Boolean)
						update[cle] = (req.body[cle] == 'true' || req.body[cle] == 'on' || req.body[cle] == 1);
					else
						if(Models.Script.properties[cle].data){
							var tmp = {};
							for(var i in Models.Script.properties[cle].data)
								if(req.body[cle] && req.body[cle].indexOf &&	req.body[cle].indexOf(i) != -1 )
									tmp[i] = 1;
							update[cle] = tmp;

						}else
							update[cle] = req.body[cle]
				}
			}
			Models.Script.findOne({where : {id : update.id }}, function(err,script){
				if(err)
					return next(err);
				if(!script){
					res.status(404);
					return res.render("page-error",{error:{ code:404, message:"Script Not found"}});
				}
				for(var cle in update)
					script[cle]  = update[cle];
				var data = script.data;
				script.data = path.join(__DIR,"scripts",script.module ? "modules" : "services",script.module ? script.name.split(/[ -]/).join("-").replace(/[^\w\-]+/g,"").toLowerCase() : md5(script.name));
				fs.writeFile(script.data, data, function (err) {
				  	if (err)
				  		next(err);
					script.save(function(err,script){
						if(err)
							return next(err);
						res.redirect(dir+"/script.info/"+script.id);
					})
				});
			});
		});
		app.route(/^\/script\.remove\/([^\/]+)$/i)
		.all(function(req,res,next){
			if(!("scripting" in req.user.droits))
				return req.redirect(dir+"/script.list");
			next();
		})
		.get(function(req,res){
			var id = req.params[0] || false;
			if(!id)
				return req.redirect(dir+"/script.list");
			Models.Script.findOne({where : {id : req.params[0] }}, function(err,script){
				if(err)
					return next(err);
				if(!script){
					res.status(404);
					return res.render("page-error",{error:{ code:404, message:"Script Not found"}});
				}
				var data = script.data;
				script.data = path.join(__DIR,"scripts",script.module ? "modules" : "services",script.module ? script.name.split(/[ -]/).join("-").replace(/[^\w\-]+/g,"").toLowerCase() : md5(script.name));
				fs.unlink(script.data, data, function (err) {
				  	if (err)
				  		next(err);
				  	Models.Script.remove({where : {id : req.params[0] }},function(err){
						if(err)
							return next(err);
						res.json({success : true, message : 'Script effacer'});
					});
				});
			});
		});
}
