module.exports = function(server){
	server.get("/healthz",function(req,res){
        res.send("OK");
    });
}

