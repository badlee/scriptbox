#!/usr/bin/env node

var connect = require('connect'),
    FileSessionStore = require('../lib/connect-session-file');

connect(
      connect.cookieParser()
    , connect.session({ 
          secret:'session file'
        , store: new FileSessionStore({path:'.', printDebug:true, useAsync:true})
    })
    , connect.favicon()
    , function(req,res,next) {
        var sess = req.session;
        console.log('+ begin ' + req.url );
        if (sess.views) {
            sess.views++;
            res.setHeader('Content-Type', 'text/html');
            res.write('<p>views: ' + sess.views + '</p>');
            res.write('<p>expires in: ' + (sess.cookie.maxAge / 1000) + 's</p>');
            res.write('<img src="blank.png"/>');
            res.write('<img src="blank2.png"/>');
            res.write('<img src="blank3.png"/>');
            res.write('<img src="blank4.png"/>');
            res.write('<img src="blank5.png"/>');
            res.end();
        } else {
            sess.views = 1;
            res.end('welcome to the file session demo. refresh!');
        }
    }
).listen(8080);