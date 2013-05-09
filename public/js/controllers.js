//'use strict';
var app=angular.module('twitcare', ['ngGrid','ui.bootstrap',"ui.bootstrap.tabs"]);
app.config(function ($routeProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'views/main.html',
        controller: 'MainCtrl'
      })
      .otherwise({
        redirectTo: '/'
      });
  });
             
app.controller("MainCtrl",function($scope,$http,$dialog) {
 var columnDefs1= [{field:'created_at',displayName:'Date'},{field:'user.screen_name',displayName:'User'},{field:'user.followers_count',displayName:'Followers'},{field:'text', displayName:'Text'}, {field:'retweet_count', displayName:'Retweets'}];
var columnDefs2= [{field:'created_at',displayName:'Date'},{field:'lang'},{field:'key',displayName:'key'},{field:'url',displayName:'url'},{field:'user.screen_name',displayName:'User'},{field:'user.followers_count',displayName:'Followers'},{field:'text', displayName:'Text'}, {field:'retweet_count', displayName:'Retweets'},{field:'score',displayName:"Score"}];
var columnDefs3= [{field:'created_at',displayName:'Date'},{field:'text', displayName:'Text'}, {field:'retweet_count', displayName:'Retweets'}];
var columnDefs4= [{field:'created_at',displayName:'Date'},{field:'key',displayName:'key'},{field:'url',displayName:'url'},{field:'user.screen_name',displayName:'User'},{field:'user.followers_count',displayName:'Followers'},{field:'text', displayName:'Text'}, {field:'retweet_count', displayName:'Retweets'},{field:'score',displayName:"Score"}];

 $scope.urls={};
 $scope.hashtags={};
 $scope.media={};
 $scope.media_urls=[];
 $scope.mentions={};
 $scope.symbols={};

 $scope.mentionsGrid={data:"y",columnDefs: columnDefs1, afterSelectionChange:function(row,event){$scope.openDialog(row)},showGroupPanel: true};
 $scope.timelineGrid={data:"model.tl",columnDefs: columnDefs2,afterSelectionChange:function(row,event){$scope.openDialog(row)}, showGroupPanel: true};
 $scope.retweetGrid={data:"x",columnDefs: columnDefs3, afterSelectionChange:function(row,event){$scope.openDialog(row)},showGroupPanel: true};
 $scope.searchGrid={data:"search.results",columnDefs: columnDefs4, afterSelectionChange:function(row,event){$scope.openDialog(row)},showGroupPanel: true};

 var load=function(name,url,cb){
  $http({method: 'GET', url: url}).
   success(function(data, status, headers, config) {
     $scope[name] = data;
     $scope.myOptions={data:data};
     if(cb) cb($scope.model.tl);
   }).
   error(function(data, status, headers, config) {
     console.log(status);
   });
  };
var calcScore=function(c) {
  
  c.forEach(function(tweet,n) {
    if(tweet.retweeted_status) {
      tweet=tweet.retweeted_status;
      $scope.model.tl[n]=tweet;
    }
    
    tweet.entities.urls.forEach(function(url) {
     
     if(!$scope.urls[url.expanded_url]) $scope.urls[url.expanded_url]=[];
     $scope.urls[url.expanded_url].push(tweet.id); 
    });
    tweet.entities.hashtags.forEach(function(t) {
     if(!$scope.hashtags[t.text]) $scope.hashtags[t.text]=[];
     $scope.hashtags[t.text].push(tweet.id);
    });
    if(tweet.entities.media)
    tweet.entities.media.forEach(function(t) {
     if(!$scope.media[t.media_url]) $scope.media[t.media_url]=[];
     $scope.media[t.media_url].push(tweet.id);
     $scope.media_urls.push(t.media_url);
    });

    tweet.entities.user_mentions.forEach(function(t) {
     if(!$scope.mentions[t.screen_name]) $scope.mentions[t.screen_name]=[];
     $scope.mentions[t.screen_name].push(tweet.id);
    });

    tweet.key=tweet.entities.hashtags[0]?tweet.entities.hashtags[0].text:"";
    tweet.url=tweet.entities.urls[0]?tweet.entities.urls[0].expanded_url:"";
    tweet.score=parseInt(10000*(tweet.retweet_count*tweet.retweet_count)/tweet.user.followers_count);
  });
  $http({method:"PUT", url:"/unshortenurls", data:$scope.urls}).
      success(function(data) {
        $scope.urls=data;
      });

 }


 load("model","/bd",calcScore);
 load("x","/retweets");
 load("y","/mentions");
 load("search","/search");
 $scope.openDialog = function(t,e){
     console.log(t.entity);
    $scope.opts = {
     backdrop: true,
     keyboard: true,
     backdropClick: true,
     templateUrl: 'views/tweet.html',
     resolve:{dialogScope:{tweet:t.entity}},
     controller: 'DialogCtrl'
    };

    var d = $dialog.dialog($scope.opts);
    d.open().then(function(r){
     var context=d.options.resolve.dialogScope;
     //context.obj[attr]=$scope.getSelectedItems(context.items);
    });
  };

});
app.controller('DialogCtrl',function($scope, dialogScope, dialog, $http){

    $scope.close = function() {
        dialog.close(undefined);
    };
    $scope.dialog = dialogScope;
});

