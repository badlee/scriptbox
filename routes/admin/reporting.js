var path = require('path'),
    fs = require('fs'),
    md5 = require('MD5');
function JSONToCSVConvertor(JSONData, Header,fn) {
    var arrData = typeof JSONData != 'object' ? JSON.parse(JSONData) : JSONData;
  console.log(arrData);
    var getCSVLine = function (obj){
        if(typeof obj == "string")
            return obj;
        var line = "";
        for(var i in Header)
            line += JSON.stringify(obj[Header[i]] || "")+",";
        line = line ? line.slice(0,-1)+"\n" : "";
        if(fn){
        	try{fn(null,line)}catch(e){fn(e)};
        	return "";
        }
        return line;
    };
    if(!arrData.length){
    	if(fn){
    		fn(null,"",true);
    		return;
    	}
    	return ''; 
    }
    if(fn){
    	try{fn(null,Header.join(",") + '\n')}catch(e){fn(e)};

    	arrData.reduce(function(a,b){
	        return getCSVLine(a)+getCSVLine(b);
	    });
	    try{fn(null,"",true);}catch(e){fn(e,"",true)};
    	return;
    }
    return Header.join(",") + '\n' + arrData.reduce(function(a,b){
        return getCSVLine(a)+getCSVLine(b);
    });
}
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
			var where = {
				where : count,
				order: 'time DESC'
			};

			if(format){
				Models.SMS.find({}, function(){
					console.log(arguments);
				});
				return Models.SMS.find(where,function(err,script){
					//res.setHeader("Content-Type","text/csv");
					//res.setHeader("Content-Disposition",'attachment; filename="report.csv"');
					if(err || !script)
						return res.send(err.message);
					JSONToCSVConvertor(script,['from', 'to', 'MotCle','sms','SMSC','time','success','received'],function(err,line,end){
						if(err) return;
						if(end) return res.send();
						res.write(line);
					});
					
				});
			}
			Models.SMS.count(count,function(err,total){
				if(err)
					return res.json({success:false, message : err.message});
				if(req.params[2] || req.query.iDisplayLength)
					where.limit = req.params[2] || req.query.iDisplayLength;
				if(req.params[4] || req.query.skip || req.query.iDisplayStart)
					where.skip = req.params[4] || req.query.skip || req.query.iDisplayStart;
				Models.SMS.find(where,function(err,script){
					if(err || !script)
						return res.json({success:false, message : err.message});
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
