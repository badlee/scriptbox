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
			if(req.params[5] || (req.query.start && req.query.end)){
				count = count || {};
				count.time = {
		            between : [req.query.start,req.query.end]
		        }
			}
			if(req.query.filter && (req.query.filter == "s" || req.query.filter =="r")){
				count = count || {};
				count.received = (req.query.filter == "r");
			}
			Models.SMS.count(count,function(err,total){
				if(err)
					return res.json({success:false, message : err.message});
				var where = {
					where : count,
					order: 'time DESC'
				};
				if(req.params[2] || req.query.iDisplayLength)
					where.limit = req.params[2] || req.query.iDisplayLength;
				if(req.params[4] || req.query.skip || req.query.iDisplayStart)
					where.skip = req.params[4] || req.query.skip || req.query.iDisplayStart;

				Models.SMS.find(where,function(err,script){
					if(err || !script)
						return res.json({success:false, message : err.message});
					if(format)
						json2csv({data: script, fields: ['from', 'to', 'MotCle','sms','SMSC','time','success','received']}, function(err, csv) {
						  if (err) return next(err);
						  res.setHeader("Content-Type","text/csv");
						  res.setHeader("Content-Disposition",'attachment; filename="report.csv"');
						  res.send(csv);
						});
					else
						res.json({ iTotalDisplayRecords : req.params[2] || total,success : true,iTotalRecords:total,aaData: script.map(function(item){  return [item.from, item.to, item.MotCle, item.sms, item.SMSC, item.time, item .success, item.received] }),message:"Requete Ok"})
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
	app.route("/reporting")
		.get(function(req, res){
			res.render("page-csv",{title:"Rapport"})
		})
}
