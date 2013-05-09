var express = require('express');
var http= require('http');
var twitter = require('ntwitter');
var app = express();
var sys = require('sys');
var oauth = require('oauth');
var connect = require('connect');
var secrets= require('./lib/secrets.js').Secrets;
var mysql = require('mysql');
var mysqlclient = mysql.createConnection({ database:'twitcare', user: secrets.db.user,  password: secrets.db.password});

var passport = require('passport')
  , util = require('util')
  , TwitterStrategy = require('passport-twitter').Strategy;

function consumer() {
  return new oauth.OAuth(
    "https://twitter.com/oauth/request_token", "https://twitter.com/oauth/access_token", 
    secrets._twitterConsumerKey, secrets._twitterConsumerSecret, "1.0A", "http://twitcare.asmuelle.de/sessions/callback", "HMAC-SHA1");   
}

passport.use(new TwitterStrategy({
    consumerKey: secrets._twitterConsumerKey,
    consumerSecret: secrets._twitterConsumerSecret,
    callbackURL: "http://twitcare.asmuelle.de/auth/twitter/callback"
  },
  function(token, tokenSecret, profile, done) {
    findOrCreateUser(token, tokenSecret, profile, function (err, user) {
      return done(err, user);
    });
  }
));


passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

var findOrCreateUser=function(token,tokenSecret,profile, cb) {
  mysqlclient.query("SELECT * from user where tid=?",[profile.id], function(err,rows) {
    if(rows.length==0) {
      var p=profile._json;
      mysqlclient.query("INSERT into user (tid, screenname,name,description, url, img_url,lang,location,timezone,utcoffset) values(?,?,?,?,?,?,?,?,?,?)",[p.id,p.username,p.name,p.description,p.url,p.profile_image_url,p.lang,p.location,p.timezone,p.utc_offset],function(err){console.log(err);});
    }
  });
  
  profile.token=token;
  profile.tokenSecret=tokenSecret;
  cb(null,profile);
};

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.session({ secret: secrets.session_phrase }));
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
  app.use(function(err, req, res, next){
    res.status(err.status || 500);
    console.log(["server error",err]);
    res.render('500', { title:"He is dead Jim!", error: err,user:req.user });
  });
  app.use(function(req, res, next){
   if (req.accepts('html')) {
    res.status(404);
    res.render('404', { title:"Not found", url: req.url,user:req.user });
    return;
   }
  });
});

app.get('/', ensureAuthenticated, function(req,res) {
 res.sendfile(__dirname + '/public/index.html');
});

app.get('/login', function(req,res) {
 res.sendfile(__dirname + '/public/signin.html');
});

app.get('/oauth',
  passport.authenticate('twitter'),
  function(req, res){
  });

req.on("error",function(err) {console.log(err)});
req.end();
});

app.put('/unshortenurls', function(request,response) {
 var retval={};
 Object.keys(request.body).forEach(function(u,i) { 
  var url=u.slice(7);
  var host=url.slice(0,url.indexOf("/"));
  var path=url.slice(url.indexOf("/"));
  var req = http.request({hostname:host,path:path ,port:80,method:"HEAD"}, function(res) {
   if(res.statusCode===301) {
      console.log(res.headers.location);
      retval[res.headers.location]=request.body[u];
   } else {retval[u]=request.body[u];}
   if(i==Object.keys(request.body).length-20)  response.send(retval);

  });

 req.on("error",function(err) {console.log(err)});

 req.end();
 });
});

app.get('/auth/twitter/callback', 
  passport.authenticate('twitter', { failureRedirect: '/login' }),
  function(req, res) {
    var u=req.user._json;
    mysqlclient.query("INSERT into user_log(tid, nstatus, nfriends, nfollowers,nlist,nfav,sdate) values(?,?,?,?,?,?,?)",
     [u.id, u.statuses_count, u.friends_count,u.followers_count, u.listed_count,u.favourites_count,new Date(u.status.created_at).getTime()],
      function(err,x) {
       if(err) console.log(err);});
       res.redirect('/');
  });

var getTwitterAPI=function(req) {
 return new twitter({
  consumer_key: secrets._twitterConsumerKey,
  consumer_secret: secrets._twitterConsumerSecret,
  access_token_key: req.user.token,
  access_token_secret: req.user.tokenSecret
});

}
app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

app.get('/bd',  function(req, res){
 getTwitterAPI(req)
  .getHomeTimeline({count:200},function (err, data) {
    res.send(err||{tl:data,user:req.user._json});
  });
});

app.get('/mentions', function(req, res){
getTwitterAPI(req)
  .getMentions({count:200},function (err, data) {
    res.send(err||data);
  });
});

app.get('/retweets', function(req, res){
 getTwitterAPI(req)
  .getRetweetsOfMe({count:200},function (err, data) {
    res.send(err||data); 
  });
});

app.get('/search', function(req, res){
 getTwitterAPI(req)
  .search("javascript OR nodejs",{count:100,include_entities:true, result_type:"popular"},function (err, data) {
    res.send(err||data);
  });
});

app.get('/follow/:id', function(req,res) {
   getTwitterAPI(req).follow(req.params.id, function(err,data) {
   res.send(err||data);
 });
});

app.get('/unfollow/:id', function(req,res) {
  getTwitterAPI(req).unfollow(req.params.id, function(err,data) {
   res.send(err||data);
 });
});

app.get('/favourize/:id', function(req,res) {
 getTwitterAPI(req).favourize(req.params.id, function(err,data) {
   res.send(err||data);
 });
});

app.get('/retweet/:id', function(req,res) {
 getTwitterAPI(req).retweet(req.params.id, function(err,data) {
   res.send(err||data);
 });
});

app.get('/retweets/:id', function(req,res) {
 getTwitterAPI(req).getRetweets(req.params.id, function(err,data) {
   res.send(err||data);
 });
});

app.get('/reply/:id', function(req,res) {
   res.send("not implemented yet")
});

app.get('/unfavourize/:id', function(req,res) {
  getTwitterAPI(req).retweet(req.params.id, function(err,data) {
   res.send(err||data);
 });
});

app.get('/tweet', function(req,res) {
 getTwitterAPI(req).updateStatus(req.query.message, function(err,data) {
   res.send(err||data);
 });
});

app.listen(3030);
console.log('Listening on port 3030');

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login')
}
