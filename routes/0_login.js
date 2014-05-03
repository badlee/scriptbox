var flash = require('connect-flash'),
	passport = require('passport'),
	LocalStrategy = require('passport-local').Strategy,
	rnd = require("randomstring");
	
// Passport Strategy.
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  Models.user.findOne({where: {username : id,actif : true}}, function (err, user) {
    done(err, user);
  });
});
passport.use(new LocalStrategy(
  function(username, password, done) {
    // asynchronous verification, for effect...
    process.nextTick(function () {
      
      // Find the user by username.  If there is no user with the given
      // username, or the password is not correct, set the user to `false` to
      // indicate failure and set a flash message.  Otherwise, return the
      // authenticated `user`.	
	Models.user.findOne({where: {username : username}}, function(err, user) {
        if (err) { return done(err); }
        if (!user) { return done(null, false, { message: 'Unknown user ' + username }); }
        if (!user.actif ) { return done(null, false, { message: 'Utilisateur desactivé' }); }
        if (!user.authentificate (password)) { return done(null, false, { message: 'Invalid password' }); }
        return done(null, user);
      })
    });
  }
));

function ensureAuthenticated(req, res, next) {
  if (/^\/(css|vendors|js|images)/i.test(req.url) || req.isAuthenticated()) { return next(); }
  res.redirect('/login');
}

module.exports = function(server){
	  server.use(flash());
	  server.use(passport.initialize());
	  server.use(passport.session());
	  // Initialize Passport!  Also use passport.session() middleware, to support
	  // persistent login sessions (recommended).
	  server.use(function(req,res,next){
	  	/* Valide l'utilisate */
	  	if(req.session.user){
	  		req.user = Object.create(req.session.user);
	  		//res.clearCookie('%23color-style');
			res.cookie('%23color-style', req.user.theme || "default",{ expires : false, path: '/admin' });
		  	delete req.user.password;
		  	swig.setDefaults({
			  	locals: {
			  		siteTitle : settings.title,
			  		random : rnd,
			  		user : req.user ,
			  		gravatar : require("nodejs-gravatar").imageUrl
			  	}
			  });
		}else{
			swig.setDefaults({
			  	locals: {
			  		siteTitle : settings.title,
			  		random : rnd,
			  		gravatar : require("nodejs-gravatar").imageUrl
			  	}
			});
		}
	  	next();
	  });
	  server.use("/admin/",function(req,res,next){
	  	/* Valide l'utilisateur */
	  	if(req.user){
	  		return Models.user.findOne({where : {username : req.user.username}}, function(err,user){
				if(err)
					return next(err);
				if(!user)
					return res.redirect("/logout");
				next();
			});
		}
	  	next();
	  });
	  server.route("/login").
	get(function(req, res){
		if(req.isAuthenticated()) return res.redirect('/admin/');
	  res.render('page-signin', { user: req.user || {}, message: req.flash('error') });
	}).post( 
	  passport.authenticate('local', { failureRedirect: '/login', failureFlash: true }),
	  function(req, res) {
	  	req.session.user = Object.create(req.user);
	  	delete req.user.password;
		res.redirect('/admin/');
  	});
  	
	server.route("/logout").
		get(function(req, res){
		  var user = req.user || {};
		  req.session.user = req.user = null;
		  //res.render('page-signin', { user: user,message: req.flash('error') });
		  res.redirect("/login");
		  
		});
		
	  server.use('/admin', ensureAuthenticated);
	  
	  //server.get(/^\/admin$/i,function(_,res){
	  //	res.redirect('/admin/');
	  //})
	  server.route("/admin/")
			.get(function(req,res){
				res.render("admin",{user: req.user, messages : req.flash(), title : "Dashboard"});
			});

	  server.use("/login",function(req,res,next){
		if (req.isAuthenticated()) { return res.redirect('/admin'); }
		next();
	  });
}
