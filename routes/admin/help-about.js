module.exports = function(app,dir){
	app.get("/help",function(req, res,next){
		res.render("page-help");
	});
	app.get("/about",function(req, res,next){
		res.render("page-about");
	});
}