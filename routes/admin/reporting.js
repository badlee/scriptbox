var path = require('path'),
    fs = require('fs'),
    md5 = require('MD5'),
    json2csv = require('json2csv');

module.exports = function(app,dir){
	var liens = {

	};
	var getServices = function(count,req,res,next){
			var format = this.csv || false;
			format = !!format;
			Models.SMS.count(count,function(err,total){
				if(err)
					return res.json({success:false, message : err.message});
				var where = {
					where : count
				};
				if(req.params[2])
					where.limit = req.params[2];
				if(req.params[4])
					where.skip = req.params[4];
				if(req.params[5]){
					where.where = where.where || {};
					where.where.time = {
			            between : [req.params[6],req.params[7]]
			        }
				}

				Models.SMS.find(where,function(err,script){
					if(err || !script)
						return res.json({success:false, message : err.message});
					if(format)
						json2csv({data: script, fields: ['from', 'to', 'MotCle','SMSC','time','success']}, function(err, csv) {
						  if (err) return next(err);
						  res.setHeader("Content-Type","text/csv");
						  res.send(csv);
						});
					else
						res.json({ success : true,count:total,data: script.map(function(item){  return {from : item.from , to: item.to, MotCle: item.MotCle, SMSC : item.SMSC, time:item.time, success : item .success} }),message:"Requete Ok"})
				})
			})
		}
	app.route(/^\/services\.json(\/(([\d]+)(-([\d]+))?)?(\/(\d+)-(\d+))?)?$/i)
		.get(getServices.bind(null,{}))
	app.route(/^\/services\.success(\/(([\d]+)(-([\d]+))?)?(\/(\d+)-(\d+))?)?$/i)
		.get(getServices.bind(null,{success : true}))
	app.route(/^\/services\.fail(\/(([\d]+)(-([\d]+))?)?(\/(\d+)-(\d+))?)?/i)
		.get(getServices.bind(null,{success : false}))
	
	app.route(/^\/services\.csv(\/(([\d]+)(-([\d]+))?)?(\/(\d+)-(\d+))?)?$/i)
		.get(getServices.bind({csv:true},{}))
	app.route(/^\/services\.success\.csv(\/(([\d]+)(-([\d]+))?)?(\/(\d+)-(\d+))?)?$/i)
		.get(getServices.bind({csv:true},{success : true}))
	app.route(/^\/services\.fail\.csv(\/(([\d]+)(-([\d]+))?)?(\/(\d+)-(\d+))?)?/i)
		.get(getServices.bind({csv:true},{success : false}))
}
