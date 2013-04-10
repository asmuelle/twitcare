var express = require('express');
var twitter = require('ntwitter');

var app = express();
var sys = require('sys');
var oauth = require('oauth');
var connect = require('connect');
var mysql = require('mysql');
var mysqlclient = mysql.createConnection({ database:'meters', user: 'root',  password: 'root'});
var secrects= require('./lib/secrets').Secrets;
function consumer() {
  return new oauth.OAuth(
    "https://twitter.com/oauth/request_token", "https://twitter.com/oauth/access_token", 
    _twitterConsumerKey, _twitterConsumerSecret, "1.0A", "http://twitcare.asmuelle.de/sessions/callback", "HMAC-SHA1");   
}


app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.session({ secret: 'keyboard cat' }));
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
  app.use(function(err, req, res, next){
    res.status(err.status || 500);
    console.log(["server error",err,req]);
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

app.get('/sessions/connect', function(req, res){
  consumer().getOAuthRequestToken(function(error, oauthToken, oauthTokenSecret, results){
    if (error) {
      res.send("Error getting OAuth request token : " + sys.inspect(error), 500);
    } else {  
      req.session.oauthRequestToken = oauthToken;
      req.session.oauthRequestTokenSecret = oauthTokenSecret;
      res.redirect("https://twitter.com/oauth/authorize?oauth_token="+req.session.oauthRequestToken);      
    }
  });
});

app.get('/sessions/callback', function(req, res){
  consumer().getOAuthAccessToken(req.session.oauthRequestToken, req.session.oauthRequestTokenSecret, req.query.oauth_verifier, function(error, oauthAccessToken, oauthAccessTokenSecret, results) {
    if (error) {
      res.send("Error getting OAuth access token : " + sys.inspect(error) + "["+oauthAccessToken+"]"+ "["+oauthAccessTokenSecret+"]"+ "["+sys.inspect(results)+"]", 500);
    } else {
      req.session.oauthAccessToken = oauthAccessToken;
      req.session.oauthAccessTokenSecret = oauthAccessTokenSecret;
      res.redirect(req.session.target);
    }
  });
});

app.get('/twitcare', ensureTwitterAuthorized, function(req, res){
  var twit = new twitter({
  consumer_key: secrets._twitterConsumerKey,
  consumer_secret: secrets._twitterConsumerSecret,
  access_token_key: req.session.oauthAccessToken,
  access_token_secret: req.session.oauthAccessTokenSecret
});
twit
  .verifyCredentials(function (err, data) {
    console.log(data);
    res.render('twitcare', { data:data});
  });
});

app.listen(3001);
console.log('Listening on port 3001');

function ensureTwitterAuthorized(req,res,next) {
 if(req.session.oauthRequestToken) {return next()}
 else {
  req.session.target=req.url;
  res.redirect('/sessions/connect')
 }
}


