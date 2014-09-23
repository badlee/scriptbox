var path = require('path'),
    fs = require('fs');
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
module.exports = function(app,dir){
	var hidden = {id:1,data : 1,},
		readOnly={id:1,keyword:1},
		liens = {
			"keyword.list" : "Liste des MotCle"
		};
	app.route(/^\/keyword\.json(\/([^\/]+)?)?$/i)
		.get(function(req,res,next){
			var id = req.params[1] || false;
			Models.MotCle[ id ? 'findById' : 'find' ](id?  id : {},function(err,items){
				if(err || !items)
					return res.json({success:false, message : err.message});

				res.json({success : true, data: (items.length ? items.map(function(item){ item.shortNumbers = s(item.shortNumbers);  return item;}) : items),message:"Requete Ok"})
			})
		})
	app.route("/keyword.list")
		.get(function(req,res,next){
			if(! ("keywording" in req.user.droits)){
				res.status(403);
				return res.render("page-error",{error : {code:403, message : "Acces interdit"}});
			}
			
			var heads = {}, checkbox = {}, listes = {}, listValues = {};
			for(var i in Models.MotCle.properties){
				if(Models.MotCle.properties[i].label)
					heads[i] = Models.MotCle.properties[i].label;
				if(Models.MotCle.properties[i].inputType == 'checkbox')
					checkbox[i] = 1;
				else if(Models.MotCle.properties[i].list)
					listes[i] = Models.MotCle.properties[i].list;
				else if(Models.MotCle.properties[i].data)
					listValues[i] = Models.MotCle.properties[i].data;
			}
			Models.MotCle.find({},function(err,items){
				if(err)
					return next(err);
				
				res.render("build-resposive-table",{
					hidden : {
						id:1,
						validator : 1,
						whiteList:1,
						blackList:1,
						rewriter:1,
						scriptId:1
					}, 
					listValues : listValues,
					fields : heads,
					title:"Liste des MotCle",
					data : items.map(function(item){ item.shortNumbers = s(item.shortNumbers);  return item;}), 
					checkboxs : checkbox, 
					listes : listes,
					getActions : function(j,user){
					return '<a title="Edit" href="'+dir+'/keyword.info/'+j.id+'" class="btn btn-blue btn-sm"><i class="fa fa-edit"></i></a>  '+
				    		'<a id="user-remove-'+j.id+'" title="Effacer" href="javascript:exec(\'/admin/keyword.remove/'+j.id+'\',\'{1}\',\'Error : {1}\',\'#user-remove-'+j.id+'\')" class="btn btn-red btn-sm"><i class="fa fa-trash-o"></i></a>';
				}  });
			})
		})
	app.route("/keyword.add")
		.all(function(req,res,next){
			if(!("keywording" in req.user.droits))
				return res.redirect(dir+"/keyword.list");
			next();
		})
		.get(function(req,res){
			var update = {},
				hidden = {id:1};
			for(var cle in Models.MotCle.properties){
				if(readOnly[cle] || (!req.user.isAdmin && Models.MotCle[cle] && Models.MotCle[cle].needAdmin) )
					continue;
				if(Models.MotCle.properties[cle].default)
					update[cle] = Models.MotCle.properties[cle].default;
			}
			res.render("build-form",{hidden:hidden,readOnly:{id:1},fields : Models.MotCle.properties,title:"Ajouter un MotCle",data : update});
		}).post(function(req,res,next){
			var readOnly = {id:1},
				update = {
					user : req.user.id
				};
			for(var cle in Models.MotCle.properties){

				if(readOnly[cle] || (!req.user.isAdmin && Models.MotCle[cle] && Models.MotCle[cle].needAdmin) )
					continue;
				if(Models.MotCle.properties[cle].type == Boolean)
					update[cle] = false;
				if( req.body[cle] ){
					if(Models.MotCle.properties[cle].type == Boolean)
						update[cle] = (req.body[cle] == 'true' || req.body[cle] == 'on' || req.body[cle] == 1);
					else if(Models.MotCle.properties[cle].type == [String])
						update[cle] = req.body[cle].map(function(item){ return item.toString()});
					else
						if(Models.MotCle.properties[cle].data){
							var tmp = {};
							for(var i in Models.MotCle.properties[cle].data)
								if(req.body[cle] && req.body[cle].indexOf &&	req.body[cle].indexOf(i) != -1 )
									tmp[i] = 1;
							update[cle] = tmp;
						}else
							update[cle] = req.body[cle]
				}
			}
			if(update.keyword == ''){
				res.status(403);
				return res.render("page-error",{error : {code:403, message : "Le MotCle "+update.keyword+" Ne peut être vide"}});	
			}
			if(update.keyword)
				update.keyword = update.keyword.toLowerCase();
			update.shortNumbers = s(update.shortNumbers);
			Models.MotCle.find({ where : {keyword : update.keyword}}, function(err,keywords){
				if(err)
					return next(err);
				for(var II = 0; II< keywords.length ; II++){
					var keyword = keywords[II];
					var wasNumber = null;
					keyword.shortNumbers = s(keyword.shortNumbers);
					if(update.shortNumbers.length == 0 && keyword.shortNumbers.length == 0){
						res.status(403);
						return res.render("page-error",{error : {code:403, message : "Le MotCle "+update.keyword+" existe deja entant de service global!"}});	
					}
					//console.log("keyword.shortNumbers",keyword.shortNumbers);
					for(var i =0; i<update.shortNumbers.length;i++){
						//console.log("TEST",keyword.shortNumbers , keyword.shortNumbers.indexOf(update.shortNumbers[i]) != -1," Valid Key word ",keyword.shortNumbers,update.shortNumbers[i],keyword.shortNumbers.indexOf(update.shortNumbers[i]));
						if(keyword.shortNumbers && keyword.shortNumbers.indexOf(update.shortNumbers[i]) != -1){
							wasNumber = update.shortNumbers[i];
							break;
						};
					}
					if(keyword && wasNumber !== null){
						res.status(403);
						return res.render("page-error",{error : {code:403, message : "Le MotCle "+update.keyword+" Existe deja pour le numero court "+wasNumber}});	
					}
				}

				new Models.MotCle(update).save(function(err,keyword){
					if(err)
						return next(err);
					res.redirect(dir+"/keyword.info/"+keyword.id);
				})
			});
		})
		app.route(/^\/keyword\.info\/([^\/]+)?$/i)
		.all(function(req,res,next){
			if(!("keywording" in req.user.droits))
				return req.redirect(dir+"/keyword.list");
			next();
		})
		.get(function(req,res,next){
			var id = req.params[0] || false;
			if(!id)
				return req.redirect(dir+"/keyword.list");
			Models.MotCle.findById(id, function(err, keyword){
				if(err)
					return next(err);
				if(keyword){
					var update = {},
						hidden = {id:1};
					for(var cle in Models.MotCle.properties){
						if(readOnly[cle] || (!req.user.isAdmin && Models.MotCle[cle] && Models.MotCle[cle].needAdmin) )
							continue;
						if(Models.MotCle.properties[cle].default)
							update[cle] = Models.MotCle.properties[cle].default;
					}
					keyword.shortNumbers = s(keyword.shortNumbers);
					res.render("build-form",{liens:liens,hidden : hidden,readOnly : readOnly,fields : Models.MotCle.properties,title:"Editer le MotCle",data : keyword});
				}else
					res.redirect(dir+"/keyword.list");
			});
		}).post(function(req,res,next){
			var id = req.params[0] || false;
			if(!id)
				return req.redirect(dir+"/keyword.list")
			var readOnly = {id:1,name:1},
				update = {id:id};
			for(var cle in Models.MotCle.properties){
				//console.log("Type",Models.MotCle.properties[cle].type,cle,req.body[cle]);
				if(readOnly[cle] || (!req.user.isAdmin && Models.MotCle[cle] && Models.MotCle[cle].needAdmin) )
					continue;
				if(Models.MotCle.properties[cle].type == Boolean)
					update[cle] = false;
				if( req.body[cle] ){
					if(Models.MotCle.properties[cle].type == Boolean)
						update[cle] = (req.body[cle] == 'true' || req.body[cle] == 'on' || req.body[cle] == 1);
					else
						if(Models.MotCle.properties[cle].data){
							var tmp = {};
							for(var i in Models.MotCle.properties[cle].data)
								if(req.body[cle] && req.body[cle].indexOf &&	req.body[cle].indexOf(i) != -1 )
									tmp[i] = 1;
							update[cle] = tmp;

						}else
							update[cle] = req.body[cle]
				}
			}

			update.shortNumbers = s(update.shortNumbers);
			Models.MotCle.find({ where : {keyword : update.keyword}}, function(err,keywords){
				if(err)
					return next(err);
				for(var II = 0; II< keywords.length ; II++){
					var keyword = keywords[II];
					if(update.id == keyword.id)
						continue;

					var wasNumber = null;
					keyword.shortNumbers = s(keyword.shortNumbers);
					console.log(keyword,update);
					if(update.shortNumbers.length == 0 && keyword.shortNumbers.length == 0){
						res.status(403);
						return res.render("page-error",{error : {code:403, message : "Le MotCle "+update.keyword+" existe deja entant de service global!"}});	
					}
					//console.log("keyword.shortNumbers",keyword.shortNumbers);
					for(var i =0; i<update.shortNumbers.length;i++){
						//console.log("TEST",keyword.shortNumbers , keyword.shortNumbers.indexOf(update.shortNumbers[i]) != -1," Valid Key word ",keyword.shortNumbers,update.shortNumbers[i],keyword.shortNumbers.indexOf(update.shortNumbers[i]));
						if(keyword.shortNumbers && keyword.shortNumbers.indexOf(update.shortNumbers[i]) != -1){
							wasNumber = update.shortNumbers[i];
							break;
						};
					}
					if(keyword && wasNumber !== null){
						res.status(403);
						return res.render("page-error",{error : {code:403, message : "Le MotCle "+update.keyword+" Existe deja pour le numero court "+wasNumber}});	
					}
				}

				Models.MotCle.findById(update.id, function(err,keyword){
					if(err)
						return next(err);
					if(!keyword){
						res.status(404);
						return res.render("page-error",{error:{ code:404, message:"MotCle Not found"}});
					}
					for(var cle in update)
						keyword[cle]  = update[cle];
					keyword.save(function(err,keyword){
						if(err)
							return next(err);
						res.redirect(dir+"/keyword.info/"+keyword.id);
					})
				});
			});
		});
		app.route(/^\/keyword\.remove\/([^\/]+)$/i)
		.all(function(req,res,next){
			if(!("keywording" in req.user.droits))
				return req.redirect(dir+"/keyword.list");
			next();
		})
		.get(function(req,res){
			var id = req.params[0] || false;
			if(!id)
				return req.redirect(dir+"/keyword.list");

			Models.MotCle.remove({where : {id : req.params[0] }},function(err){
				if(err)
					return next(err);
				res.json({success : true, message : 'MotCle effacer'});
			});
		});
}

