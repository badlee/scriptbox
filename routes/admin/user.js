module.exports = function(app,dir){
	var hidden = {id:1, smsPWD:0},readOnly={username:1,id:1};
	app.get("/user.theme",function(req, res,next){
		var theme = req.query.color || false;
		if(theme){
			req.user.theme = theme;
			Models.user.findOne({where : {id : req.user.id}}, function(err, user){
				if(err)
					return next(err.codes);
				user.updateAttribute('theme', theme, function(err){
					if(err)
						next(err);
					else{
						req.session.user.theme = user.theme;
						res.json({success : true});
					}
				});
			})
		}else
			res.json({color: req.user.theme});
	});
	// Obtention et mise à jour des info utilisateur
	app.route(/^\/user\.info(\/([^\/]+)?)?$/i).
		get(function(req,res){
			var id = req.params[1] || false;
			if(id===false)
				res.render("build-form",{hidden : hidden,readOnly : readOnly,fields : Models.user.properties,title:"Information Utilisateur",data : req.user});
			else{
				if(id && !req.user.isAdmin){
					res.status(403);
					return res.render("page-error",{error : {code:403, message : "Acces interdit"}});
				}
				Models.user.findOne({where : {id : id}}, function(err, user){
					if(err)
						return next(err);
					if(user){
						var hidden2 = Object.create(hidden);
						if(user.id != req.user.id){
							hidden2.smsPWD = 1;
						}
						res.render("build-form",{hidden : hidden2,readOnly : readOnly,fields : Models.user.properties,title:"Information Utilisateur",data : user});	
					}else{
						res.status(404);
						res.render("page-error",{error:{ code:404, message:"User Not found"}});	
					}
				});
			}
		}).
		post(function(req, res,next){
			if(req.params[1] && !req.user.isAdmin){
				res.status(403);
				return res.render("page-error",{error : {code:403, message : "Acces interdit"}});
			}
			var readOnly = {username:1,id:1,init : 1},
				update = {};
				console
			for(var cle in Models.user.properties){
				if(readOnly[cle] || (!req.user.isAdmin && Models.user.properties[cle] && Models.user.properties[cle].needAdmin) )
					continue;
				if(Models.user.properties[cle].type == Boolean)
					update[cle] = false;
				
				if( req.body[cle] ){
					if(Models.user.properties[cle].type == Boolean)
						update[cle] = (req.body[cle] == 'true' || req.body[cle] == 'on' || req.body[cle] == 1);
					else
						if(Models.user.properties[cle].data){
							var tmp = {};
							for(var i in Models.user.properties[cle].data)
								if(req.body[cle] && req.body[cle].indexOf &&	req.body[cle].indexOf(i) != -1 )
									tmp[i] = 1;
							update[cle] = tmp;

						}else
							update[cle] = req.body[cle]
				}
			}
			Models.user.findOne({where : {id : req.params[1] || update.id || req.user.id }},function(err,user){
				if(err)
					return next(err);
				if(!user){
					res.status(404);
					return res.render("page-error",{error:{ code:404, message:"User Not found"}});	
				}
				for(var cle in update){
					if(req.session.user.id == update.id)
						req.session.user[cle] = update[cle];
					user[cle]  = update[cle];
				}
				user.save(function(err,user){
					if(err)
						return next(err);
					var hidden2 = Object.create(hidden);
					if(req.user.id == user.id){
						req.session.user = user;
						hidden2.smsPWD = 1;
					}

					res.render("build-form",{hidden : hidden2,readOnly : readOnly,fields : Models.user.properties,title:"Information Utilisateur",data : user});
				})
			});
		});
		app.route("/user.list")
		.get(function(req,res,next){
			if(!req.user.isAdmin){
				res.status(403);
				return res.render("page-error",{error : {code:403, message : "Acces interdit"}});
			}
			var heads = {}, checkbox = {}, listes = {}, listValues = {};
			for(var i in Models.user.properties){
				if(Models.user.properties[i].label)
					heads[i] = Models.user.properties[i].label;
				if(Models.user.properties[i].inputType == 'checkbox')
					checkbox[i] = 1;
				else if(Models.user.properties[i].list)
					listes[i] = Models.user.properties[i].list;
				else if(Models.user.properties[i].data)
					listValues[i] = Models.user.properties[i].data;
			}
			
			Models.user.find({},function(err,users){
				if(err)
					return next(err);

				var hidden2 = Object.create(hidden);
				hidden2.smsPWD = 1;
				res.render("build-resposive-table",{ hidden : hidden2, listValues : listValues,fields : heads,title:"Liste des Utilisateurs",data : users, checkboxs : checkbox, listes : listes,getActions : function(j,user){
					return '<a title="Edit" href="'+dir+'/user.info/'+j.id+'" class="btn btn-blue btn-sm"><i class="fa fa-edit"></i></a>  '+
				    		( j.id != user.id ? '<a title="Reset Password" href="javascript:exec(\'/admin/user.reset.pwd/'+j.id+'\',\'Le nouveau mot de passe est : {1}\',\'Mot de passe non change!\')" class="btn btn-violet btn-sm"><i class="fa fa-keyboard-o"></i></a>  '+
				    		'<a id="user-remove-'+j.id+'" title="Effacer" href="javascript:exec(\'/admin/user.remove/'+j.id+'\',\'Utilisateur Effacé\',\'Error : {1}\',\'#user-remove-'+j.id+'\')" class="btn btn-red btn-sm"><i class="fa fa-trash-o"></i></a>' : '');
				}  });
			})
		});
		app.route(/^\/user\.pwd(\/([^\/]+)?)?$/i)
		.get(function(req,res){
			res.status(403);
			res.render("page-error",{error : {code:403, message : "Acces interdit"}});
		}).post(function(req,res){
			if(req.params[1] && !req.user.isAdmin){
				res.status(403);
				return res.render("page-error",{error : {code:403, message : "Acces interdit"}});
			}
			Models.user.findOne({where : {id : req.params[1] || req.user.id }},function(err,user){
				if(err)
					return next(err);
				if(!user){
					res.status(404);
					return res.json({success:false,message: "User not Found"});	
				}
				if(!req.body['password']){
					res.status(403);
					return res.json({success:false,message: "Password not defined"});	
				}
				user.setPWD(req.body['password'], function(err){
					if(err)
						next(err);
					else{
						req.session.user.theme = user.theme;
						res.json({success : true});
					}
				});
				
			});
		});	
		app.route(/^\/user\.reset\.pwd\/([^\/]+)$/i)
		.get(function(req,res){
			if(!req.user.isAdmin){
				res.status(403);
				return res.render("page-error",{error : {code:403, message : "Acces interdit"}});
			}
			Models.user.findOne({where : {id : req.params[0] }},function(err,user){
				if(err)
					return next(err);
				if(!user){
					res.status(404);
					return res.json({success:false,message: "User not Found"});	
				}
				user.randomPWD(function(pwd,err){
					if(err)
						next(err);
					else{
						res.json({success : true, message : pwd});
					}
				});
				
			});
		});
		app.route(/^\/user\.remove\/([^\/]+)$/i)
		.get(function(req,res){
			if(req.params[0] == req.user.id)
				return res.json({success : false, message:"ne peut s'effacer soi même"});
			if(!req.user.isAdmin){
				res.status(403);
				return res.render("page-error",{error : {code:403, message : "Acces interdit"}});
			}
			Models.user.remove({where : {id : req.params[0] }},function(err){
				if(err)
					return next(err);
				res.json({success : true, message : 'Utilisateur effacer'});
			});
		});

		app.route("/user.add")
		.all(function(req,res,next){
			if(!req.user.isAdmin){
				res.status(403);
				return res.render("page-error",{error : {code:403, message : "Acces interdit"}});
			}
			next();
		}).get(function(req,res){
			var readOnly = {id:1},
				update = {};
			for(var cle in Models.user.properties){
				if(readOnly[cle] || (!req.user.isAdmin && Models.user[cle] && Models.user[cle].needAdmin) )
					continue;
				if(Models.user.properties[cle].default)
					update[cle] = Models.user.properties[cle].default;
			}
			res.render("build-form",{hidden:hidden,readOnly:{id:1},fields : Models.user.properties,title:"Ajouter un Utilisateur",data : update});
		}).post(function (req,res,next) {
			var readOnly = {id:1},
				update = {};
			for(var cle in Models.user.properties){
				if(readOnly[cle] || (!req.user.isAdmin && Models.user[cle] && Models.user[cle].needAdmin) )
					continue;
				if(Models.user.properties[cle].type == Boolean)
					update[cle] = false;
				if( req.body[cle] ){
					if(Models.user.properties[cle].type == Boolean)
						update[cle] = (req.body[cle] == 'true' || req.body[cle] == 'on' || req.body[cle] == 1);
					else
						if(Models.user.properties[cle].data){
							var tmp = {};
							for(var i in Models.user.properties[cle].data)
								if(req.body[cle] && req.body[cle].indexOf &&	req.body[cle].indexOf(i) != -1 )
									tmp[i] = 1;
							update[cle] = tmp;

						}else
							update[cle] = req.body[cle]
				}
			}
			Models.user.findOne({where : {username : req.body.username}}, function(err,user){
				if(err)
					return next(err);
				if(user){
					res.status(403);
					return res.render("page-error",{error : {code:403, message : "Utilisateur "+username+"Existe deja"}});	
				}
				Models.user.findOne({where : {email : req.body.email}}, function(err,user){
					if(err)
						return next(err);
					if(user){
						res.status(403);
						return res.render("page-error",{error : {code:403, message : "Le mail "+user.email+" existe deja!"}});	
					}
					new Models.user(update).save(function(err,user){
						if(err)
							return next(err);
						res.redirect("user.info/"+user.id);
					})
				});
			});
		});
		app.route("/user.todo.list").get(function(req,res){
			res.render("page-todo",{title:"TODO list"});
		})
		app.route("/user.todo").get(function(req,res){
			res.json(req.user.todo);
		}).delete(function(req,res){
			if(!req.body.data)
				return res.json({success : false,message : "no data"});
			Models.user.findOne({where : {id : req.user.id }}, function(err,user){
					if(err)
						return next(err);
					if(!user){
						res.status(404);
						return res.render("page-error",{error : {code:404, message : "Utilisateur n'existe pas!"}});	
					}
					var id = user.todo.items.reduce(function(prev,next,index){
						if(index!=1)
							return prev !== false ? prev : (next.data == req.body.data ? index : false);
						if(prev && prev.data == req.body.data)
							return index-1
						else if (next && next.data == req.body.data){
							return index
						};
						return false;
					});
					if(id != -1){
						user.todo.items.splice(id,1);
						user.save(function(err,user){
							if(err)
								return next(err);
							req.session.user.todo = user.todo;
							return res.json({success : true,message : "Todo Effacé"});
						})
					}else{
						return res.json({success : false,message : "Todo non trouvé"});
					}
				});
		}).put(function(req,res){
			if(!req.body.data)
				return res.json({success : false,message : "no data"});
			Models.user.findOne({where : {id : req.user.id }}, function(err,user){
					if(err)
						return next(err);
					if(!user){
						res.status(404);
						return res.render("page-error",{error : {code:404, message : "Utilisateur n'existe pas!"}});	
					}
					var id = user.todo.items.reduce(function(prev,next,index){
						if(index!=1)
							return prev !== false ? prev : (next.data == req.body.data ? index : false);
						if(prev && prev.data == req.body.data)
							return index-1
						else if (next && next.data == req.body.data){
							return index
						};
						return false;
					});
					if(id != -1 && user.todo.items[id]){
						user.todo.items[id].complete = !user.todo.items[id].complete;
						user.todo.items[id].save(function(err,user){
							if(err)
								return next(err);
							req.session.user = user;
							return res.json({success : true,message : "Todo complete"});
						})
					}else{
						return res.json({success : false,message : "Todo non trouvé"});
					}
				});
		}).post(function(req,res){
			if(!req.body.data)
				return res.json({success : false,message : "no data"});
			Models.user.findOne({where : {id : req.user.id }}, function(err,user){
					if(err)
						return next(err);
					if(!user){
						res.status(404);
						return res.render("page-error",{error : {code:404, message : "Utilisateur n'existe pas!"}});	
					}
					user.todo.push({data:req.body.data, complete : false});
					user.save(function(err,user){
						if(err)
							return next(err);
						req.session.user.todo = user.todo;
						return res.json({success : true,message : "Todo Ajouté"});
					})
				});
		});
		app.route("/todo")
		.get(function(req,res){
			res.json(req.query);
		}).delete(function(req,res){
			res.json(req.body);
		}).put(function(req,res){
			res.json(req.body);
		}).post(function(req,res){
			res.json(req.body);
		});

	}
