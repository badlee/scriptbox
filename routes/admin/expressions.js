var path = require('path'),
    fs = require('fs');

module.exports = function(app,dir){
	var hidden = {id:1,data : 1,},
		readOnly={id:1,name:1},
		liens = {
			"expression.list" : "Liste des Expression"
		};
	app.route(/^\/expression\.json(\/([^\/]+)?)?$/i)
		.get(function(req,res,next){
			var id = req.params[1] || false;
			Models.Expression.find(id? {where : {id : id} } : {}).run(function(err,expressions){
				if(err || !expressions)
					return res.json({success:false, message : err.message});
				res.json({success : true,data:(expressions.length ? expressions.map(function(item){  return {value : item.id , text: item.name, data : (item.expression || "") +"[:ø:]"+(item.options || "")} }) : expressions),message:"Requete Ok"})
			})
		})
	app.route("/expression.list")
		.get(function(req,res,next){
			if(! ("expression" in req.user.droits)){
				res.status(403);
				return res.render("page-error",{error : {code:403, message : "Acces interdit"}});
			}
			
			var heads = {}, checkbox = {}, listes = {}, listValues = {};
			for(var i in Models.Expression.properties){
				if(Models.Expression.properties[i].label)
					heads[i] = Models.Expression.properties[i].label;
				if(Models.Expression.properties[i].inputType == 'checkbox')
					checkbox[i] = 1;
				else if(Models.Expression.properties[i].list)
					listes[i] = Models.Expression.properties[i].list;
				else if(Models.Expression.properties[i].data)
					listValues[i] = Models.Expression.properties[i].data;
			}
			
			Models.Expression.find({},function(err,items){
				if(err)
					return next(err);
				res.render("build-resposive-table",{ hidden : hidden, listValues : listValues,fields : heads,title:"Liste des Expression",data : items, checkboxs : checkbox, listes : listes,getActions : function(j,user){
					return '<a title="Edit" href="'+dir+'/expression.info/'+j.id+'" class="btn btn-blue btn-sm"><i class="fa fa-edit"></i></a>  '+
				    		'<a id="user-remove-'+j.id+'" title="Effacer" href="javascript:exec(\'/admin/expression.remove/'+j.id+'\',\'{1}\',\'Error : {1}\',\'#user-remove-'+j.id+'\')" class="btn btn-red btn-sm"><i class="fa fa-trash-o"></i></a>';
				}  });
			})
		})
	app.route("/expression.add")
		.all(function(req,res,next){
			if(!("expression" in req.user.droits))
				return res.redirect(dir+"/expression.list");
			next();
		})
		.get(function(req,res){
			var update = {},
				hidden = {id:1};
			for(var cle in Models.Expression.properties){
				if(readOnly[cle] || (!req.user.isAdmin && Models.Expression[cle] && Models.Expression[cle].needAdmin) )
					continue;
				if(Models.Expression.properties[cle].default)
					update[cle] = Models.Expression.properties[cle].default;
			}
			res.render("build-form",{hidden:hidden,readOnly:{id:1},fields : Models.Expression.properties,title:"Ajouter un Expression",data : update});
		}).post(function(req,res,next){
			var readOnly = {id:1},
				update = {
				};
			for(var cle in Models.Expression.properties){
				if(readOnly[cle] || (!req.user.isAdmin && Models.Expression[cle] && Models.Expression[cle].needAdmin) )
					continue;
				if(Models.Expression.properties[cle].type == Boolean)
					update[cle] = false;
				if( req.body[cle] ){
					if(Models.Expression.properties[cle].type == Boolean)
						update[cle] = (req.body[cle] == 'true' || req.body[cle] == 'on' || req.body[cle] == 1);
					else
						if(Models.Expression.properties[cle].data){
							var tmp = {};
							for(var i in Models.Expression.properties[cle].data)
								if(req.body[cle] && req.body[cle].indexOf &&	req.body[cle].indexOf(i) != -1 )
									tmp[i] = 1;
							update[cle] = tmp;

						}else
							update[cle] = req.body[cle]
				}
			}
			Models.Expression.findOne({ where : {name : update.name }}, function(err,expression){
				if(err)
					return next(err);
				if(expression){
					res.status(403);
					return res.render("page-error",{error : {code:403, message : "Le Expression "+req.body.name+" Existe deja"}});	
				}
				console.log(update);
				new Models.Expression(update).save(function(err,expression){
					if(err)
						return next(err);
					res.redirect(dir+"/expression.info/"+expression.id);
				})
			});
		})
		app.route(/^\/expression\.info\/([^\/]+)?$/i)
		.all(function(req,res,next){
			if(!("expression" in req.user.droits))
				return req.redirect(dir+"/expression.list");
			next();
		})
		.get(function(req,res,next){
			var id = req.params[0] || false;
			if(!id)
				return req.redirect(dir+"/expression.list");
			Models.Expression.findOne({where : {id : id}}, function(err, expression){
				if(err)
					return next(err);
				if(expression){
					var update = {},
						hidden = {id:1};
					for(var cle in Models.Expression.properties){
						if(readOnly[cle] || (!req.user.isAdmin && Models.Expression[cle] && Models.Expression[cle].needAdmin) )
							continue;
						if(Models.Expression.properties[cle].default)
							update[cle] = Models.Expression.properties[cle].default;
					}
					res.render("build-form",{liens:liens,hidden : hidden,readOnly : readOnly,fields : Models.Expression.properties,title:"Editer le Expression",data : expression});
				}else
					res.redirect(dir+"/expression.list");
			});
		}).post(function(req,res,next){
			var id = req.params[0] || false;
			if(!id)
				return req.redirect(dir+"/expression.list")
			var readOnly = {id:1,name:1},
				update = {id:id};
			for(var cle in Models.Expression.properties){
				if(readOnly[cle] || (!req.user.isAdmin && Models.Expression[cle] && Models.Expression[cle].needAdmin) )
					continue;
				if(Models.Expression.properties[cle].type == Boolean)
					update[cle] = false;
				if( req.body[cle] ){
					if(Models.Expression.properties[cle].type == Boolean)
						update[cle] = (req.body[cle] == 'true' || req.body[cle] == 'on' || req.body[cle] == 1);
					else
						if(Models.Expression.properties[cle].data){
							var tmp = {};
							for(var i in Models.Expression.properties[cle].data)
								if(req.body[cle] && req.body[cle].indexOf &&	req.body[cle].indexOf(i) != -1 )
									tmp[i] = 1;
							update[cle] = tmp;

						}else
							update[cle] = req.body[cle]
				}
			}
			Models.Expression.findOne({where : {id : update.id  }}, function(err,expression){
				if(err)
					return next(err);
				console.log(err,expression);
				if(!expression){
					res.status(404);
					return res.render("page-error",{error:{ code:404, message:"Expression Not found"}});
				}
				for(var cle in update)
					expression[cle]  = update[cle];
				
				expression.save(function(err,expression){
					if(err)
						return next(err);
					res.redirect(dir+"/expression.info/"+expression.id);
				})
			});
		});
		app.route(/^\/expression\.remove\/([^\/]+)$/i)
		.all(function(req,res,next){
			if(!("expression" in req.user.droits))
				return req.redirect(dir+"/expression.list");
			next();
		})
		.get(function(req,res){
			var id = req.params[0] || false;
			if(!id)
				return req.redirect(dir+"/expression.list");

			Models.Expression.remove({where : {id : req.params[0] }},function(err){
				if(err)
					return next(err);
				res.json({success : true, message : 'Expression effacer'});
			});
		});
}

