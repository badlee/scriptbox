module.exports = function(app,dir){
	var hidden = {id:1,data : 1,},
		readOnly={id:1,num:1},
		liens = {
			"shortnumber.list" : "Liste des Numeros Courts"
		};
	app.route(/^\/shortnumber\.json(\/([^\/]+)?)?$/i)
		.get(function(req,res,next){
			var id = req.params[1] || false;
			Models.Shortnumber[ id ? 'findOne' : 'find' ](id? {where : {id : id} } : {},function(err,shortnumbers){
				if(err || !shortnumbers)
					return res.json({success:false, message : err.message});

				res.json({success : true, data: (shortnumbers.length ? shortnumbers.map(function(item){  return { value : item.num , text: "["+item.num + "] " +item.desc}}) : shortnumbers),message:"Requete Ok"})
			})
		})
	app.route("/shortnumber.list")
		.get(function(req,res,next){
			if(! ("shortnumber" in req.user.droits)){
				res.status(403);
				return res.render("page-error",{error : {code:403, message : "Acces interdit"}});
			}
			
			var heads = {}, checkbox = {}, listes = {}, listValues = {};
			for(var i in Models.Shortnumber.properties){
				if(Models.Shortnumber.properties[i].label)
					heads[i] = Models.Shortnumber.properties[i].label;
				if(Models.Shortnumber.properties[i].inputType == 'checkbox')
					checkbox[i] = 1;
				else if(Models.Shortnumber.properties[i].list)
					listes[i] = Models.Shortnumber.properties[i].list;
				else if(Models.Shortnumber.properties[i].data)
					listValues[i] = Models.Shortnumber.properties[i].data;
			}
			
			Models.Shortnumber.find({},function(err,items){
				if(err)
					return next(err);
				res.render("build-resposive-table",{ hidden : hidden, listValues : listValues,fields : heads,title:"Liste des numero courts",data : items, checkboxs : checkbox, listes : listes,getActions : function(j,user){
					return '<a title="Edit" href="'+dir+'/shortnumber.info/'+j.id+'" class="btn btn-blue btn-sm"><i class="fa fa-edit"></i></a>  '+
				    		'<a id="user-remove-'+j.id+'" title="Effacer" href="javascript:exec(\'/admin/shortnumber.remove/'+j.id+'\',\'{1}\',\'Error : {1}\',\'#user-remove-'+j.id+'\')" class="btn btn-red btn-sm"><i class="fa fa-trash-o"></i></a>';
				}  });
			})
		})
	app.route("/shortnumber.add")
		.all(function(req,res,next){
			if(!("shortnumber" in req.user.droits))
				return res.redirect(dir+"/shortnumber.list");
			next();
		})
		.get(function(req,res){
			var update = {},
				hidden = {id:1};
			for(var cle in Models.Shortnumber.properties){
				if(readOnly[cle] || (!req.user.isAdmin && Models.Shortnumber[cle] && Models.Shortnumber[cle].needAdmin) )
					continue;
				if(Models.Shortnumber.properties[cle].default)
					update[cle] = Models.Shortnumber.properties[cle].default;
			}
			res.render("build-form",{hidden:hidden,readOnly:{id:1},fields : Models.Shortnumber.properties,title:"Ajouter un numero court",data : update});
		}).post(function(req,res,next){
			var readOnly = {id:1},
				update = {
				};
			for(var cle in Models.Shortnumber.properties){
				if(readOnly[cle] || (!req.user.isAdmin && Models.Shortnumber[cle] && Models.Shortnumber[cle].needAdmin) )
					continue;
				if(Models.Shortnumber.properties[cle].type == Boolean)
					update[cle] = false;
				if( req.body[cle] ){
					if(Models.Shortnumber.properties[cle].type == Boolean)
						update[cle] = (req.body[cle] == 'true' || req.body[cle] == 'on' || req.body[cle] == 1);
					else
						if(Models.Shortnumber.properties[cle].data){
							var tmp = {};
							for(var i in Models.Shortnumber.properties[cle].data)
								if(req.body[cle] && req.body[cle].indexOf &&	req.body[cle].indexOf(i) != -1 )
									tmp[i] = 1;
							update[cle] = tmp;

						}else
							update[cle] = req.body[cle]
				}
			}
			Models.Shortnumber.findOne({ where : {name : update.name }}, function(err,shortnumber){
				if(err)
					return next(err);
				if(shortnumber){
					res.status(403);
					return res.render("page-error",{error : {code:403, message : "Le Numero court "+req.body.name+" Existe deja"}});	
				}
				console.log(update);
				new Models.Shortnumber(update).save(function(err,shortnumber){
					if(err)
						return next(err);
					res.redirect(dir+"/shortnumber.info/"+shortnumber.id);
				})
			});
		})
		app.route(/^\/shortnumber\.info\/([^\/]+)?$/i)
		.all(function(req,res,next){
			if(!("shortnumber" in req.user.droits))
				return req.redirect(dir+"/shortnumber.list");
			next();
		})
		.get(function(req,res,next){
			var id = req.params[0] || false;
			if(!id)
				return req.redirect(dir+"/shortnumber.list");
			Models.Shortnumber.findById(id, function(err, shortnumber){
				if(err)
					return next(err);
				if(shortnumber){
					var update = {},
						hidden = {id:1};
					for(var cle in Models.Shortnumber.properties){
						if(readOnly[cle] || (!req.user.isAdmin && Models.Shortnumber[cle] && Models.Shortnumber[cle].needAdmin) )
							continue;
						if(Models.Shortnumber.properties[cle].default)
							update[cle] = Models.Shortnumber.properties[cle].default;
					}
					res.render("build-form",{liens:liens,hidden : hidden,readOnly : readOnly,fields : Models.Shortnumber.properties,title:"Editer le Numero Court",data : shortnumber});
				}else
					res.redirect(dir+"/shortnumber.list");
			});
		}).post(function(req,res,next){
			var id = req.params[0] || false;
			if(!id)
				return req.redirect(dir+"/shortnumber.list")
			var readOnly = {id:1,name:1},
				update = {id:id};
			for(var cle in Models.Shortnumber.properties){
				if(readOnly[cle] || (!req.user.isAdmin && Models.Shortnumber[cle] && Models.Shortnumber[cle].needAdmin) )
					continue;
				if(Models.Shortnumber.properties[cle].type == Boolean)
					update[cle] = false;
				if( req.body[cle] ){
					if(Models.Shortnumber.properties[cle].type == Boolean)
						update[cle] = (req.body[cle] == 'true' || req.body[cle] == 'on' || req.body[cle] == 1);
					else
						if(Models.Shortnumber.properties[cle].data){
							var tmp = {};
							for(var i in Models.Shortnumber.properties[cle].data)
								if(req.body[cle] && req.body[cle].indexOf &&	req.body[cle].indexOf(i) != -1 )
									tmp[i] = 1;
							update[cle] = tmp;

						}else
							update[cle] = req.body[cle]
				}
			}
			Models.Shortnumber.findById(update.id, function(err,shortnumber){
				if(err)
					return next(err);
				console.log(err,shortnumber);
				if(!shortnumber){
					res.status(404);
					return res.render("page-error",{error:{ code:404, message:"Numero court Not found"}});
				}
				for(var cle in update)
					shortnumber[cle]  = update[cle];
				
				shortnumber.save(function(err,shortnumber){
					if(err)
						return next(err);
					res.redirect(dir+"/shortnumber.info/"+shortnumber.id);
				})
			});
		});
		app.route(/^\/shortnumber\.remove\/([^\/]+)$/i)
		.all(function(req,res,next){
			if(!("shortnumber" in req.user.droits))
				return req.redirect(dir+"/shortnumber.list");
			next();
		})
		.get(function(req,res){
			var id = req.params[0] || false;
			if(!id)
				return req.redirect(dir+"/shortnumber.list");

			Models.Shortnumber.remove({where : {id : req.params[0] }},function(err){
				if(err)
					return next(err);
				res.json({success : true, message : 'Numero court effacé'});
			});
		});
}

