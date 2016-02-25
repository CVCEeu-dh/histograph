/*

  Welcome to Histograph
  ===

*/
var express       = require('express'),        // call express
    compress      = require('compression'),
    session       = require('express-session'),
    
    settings      = require('./settings'),

    app           = exports.app = express(),                 // define our app using express
    port          = settings.port || process.env.PORT || 8000,
    env           = settings.env || process.env.NODE_ENV || 'development',
    server        = app.listen(port),
    io            = require('socket.io')
                      .listen(server),

    auth          = require('./auth'), // auth mechanism with passport
    
    bodyParser    = require('body-parser'),
    cookieParser  = require('cookie-parser'),
    
    fs            = require('fs'),
    path          = require('path'),
    morgan        = require('morgan'),    // logging puropse

    ctrl          = require('require-all')({
                      dirname: __dirname + '/controllers',
                      filter  :  /(.*).js$/,
                      resolve : function (f) {
                        return f(io);
                      }
                    }),

    cache         = undefined, // undefined; cfr. below

    clientRouter  = express.Router(),
    apiRouter     = express.Router(),

    _             = require('lodash'),
    
    // app client scripts dependencies (load scripts in jade)
    clientFiles  = require('./client/src/files')[env];


// check cache availability with redis
if(settings.cache && settings.cache.redis) {
  cache = require('express-redis-cache')({
    host: settings.cache.redis.host,
    port: settings.cache.redis.port,
    expire: 5 * 60 // 5 min OR till a POST/delete has benn done
  });

  cache.on('connected', function () {
    console.log('cache:','connected to redis'); 
  });

  cache.on('error', function (error) {
    console.log('redis connection error', error)
  });
}

var getCacheName = function(req) {
    return [req.path, JSON.stringify(req.query)].join().split(/[\/\{,:"\}]/)
      .join('-')
      .replace(/-{2,}/g, '-')
      .replace(/^-/, '')
      .replace(/-$/, '');// + '?' + JSON.stringify(req.query);
  };

// initilalize session middleware
var sessionMiddleware = session({
  name: 'hg.sid',
  secret: settings.secret.cookie,
  trustProxy: false,
  resave: true,
  saveUninitialized: true
})

console.log('title:', settings.title);
console.log('logs: ', settings.paths.accesslog);
console.log('env:  ', env);
console.log('port: ', settings.port);
console.log('url:  ', settings.baseurl);
if(!cache){
  console.log('cache:', 'not enabled');
}



app.use(compress());

// configure logger
app.use(morgan('combined', {
  stream: fs.createWriteStream(settings.paths.accesslog, {flags: 'a'})
}));

if ('production' == env) {
  app.use(express.static('./client/dist'));
} else {
  app.use(express.static('./client/src'));
}
// serve docco documentation
// app.use('/docs', express.static('./docs'));


// configure static files and jade templates

app.set('views', './client/views');
app.set('view engine', 'jade');


// configure app to use bodyParser(), this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// configure app to use sessions
app.use(cookieParser());
app.use(sessionMiddleware);


app.use(auth.passport.initialize());
app.use(auth.passport.session());

// enrich express responses
express.response.ok = function(result, info, warnings) {
  var res = {
    status: 'ok',
    // user: this.req.user,
    result: result
  };
  
  if(info)
    res.info = info;
  
  if(warnings)
    res.warnings = warnings
  
  if(cache && (this.req.method == 'POST' || this.req.method == 'DELETE')) {
    // delete the cache comppletely
    var __ins = this;
    cache.del('*', function() {
      return __ins.json(res);
    });
    // // console.log(this.req.method , getCacheName(this.req));
    // // refresh related caches if any
    // var cnm = getCacheName(this.req).match(/[a-z]+-\d+/),
    //     __ins = this;
    // // it "should" be improved @todo
    // if(cnm)
    //   cache.del(cnm[0] + '*', function() {
    //     return __ins.json(res);
    //   });
    // else
    //   return this.json(res);
  }
  else 
    return this.json(res);
};

express.response.empty = function(warnings) {
  // Since The 204 response MUST NOT include a message-body, we use a dummy 200 with status = empty...
  return this.status(200).json({
    status: 'empty'
  });
};

express.response.error = function(statusCode, err) {
  return this.status(statusCode).json({
    status: 'error',
    error: _.assign({
      code: statusCode,
    }, err)
  });
};

/*
  Client router configuration
*/
clientRouter.route('/').
  get(function(req, res) { // test route to make sure everything is working (accessed at GET http://localhost:8080/api)
    res.render('index', {
      user: req.user || 'anonymous',
      message: 'hooray! welcome to our api!',
      types: settings.types,
      title: settings.title,
      analytics: settings.analytics,
      scripts: clientFiles.scripts
    });
  });
  
clientRouter.route('/terms').
  get(function(req, res) { // test route to make sure everything is working (accessed at GET http://localhost:8080/api)
    res.render('terms', {
      user: req.user || 'anonymous',
      message: 'hooray! welcome to our api!',
      types: settings.types,
      title: settings.title,
      analytics: settings.analytics,
      scripts: clientFiles.scripts
    });
  });

clientRouter.route('/login')
  .post(function (req, res, next) {
    auth.passport.authenticate('local', function(err, user, info) {
      if(err) {
        //console.log('login error', err)
        return res.error(403, {message: 'not valid credentials'});
      }
      req.logIn(user, function(err) {
        if (err)
          return next(err);
        return res.redirect('/api');
      });
    })(req, res, next)
  });

clientRouter.route('/logout')
  .get(function(req, res){
    req.logout();
    res.redirect('/')
    // res.render('index', {
    //   user: req.user || 'anonymous',
    //   message: 'hooray! welcome to our api!',
    //   scripts: clientFiles.scripts
    // });
  });

clientRouter.route('/signup')
  .post(ctrl.user.signup)

clientRouter.route('/activate')
  .get(ctrl.user.activate)


// twitter oauth mechanism
clientRouter.route('/auth/twitter')
  .get(function (req, res, next) {
    if(req.query.next) {
      var qs = '';
      
      if(req.query.jsonparams) {
        try{
          var params = JSON.parse(req.query.jsonparams),
              qsp =  [];
              
          for(var key in params) {
            qsp.push(encodeURIComponent(key) + '=' + encodeURIComponent(params[key]));
          }
          
          if(qsp.length)
            qs = '?' + qsp.join('&')
        } catch(e){
          
        }
      }
      req.session.redirectAfterLogin = req.query.next + qs;
      
      console.log(req.query, req.params, req.session)
    }
    
    auth.passport.authenticate('twitter')(req, res, next)
  });

clientRouter.route('/auth/twitter/callback')
  .get(function (req, res, next) {
    auth.passport.authenticate('twitter', function(err, user, info) {
      //console.log('user', user); // handle errors
      req.logIn(user, function(err) {
        if (err)
          return next(err);
        if(req.session.redirectAfterLogin) {
          console.log('redirect to', req.session.redirectAfterLogin)
          return res.redirect('/#' + req.session.redirectAfterLogin)
        }
          
        return res.redirect('/');
      });
    })(req, res, next)
  });


// google oauth mechanism
clientRouter.route('/auth/google')
  .get(function (req, res, next) {
    if(req.query.next) {
      var qs = '';
      
      if(req.query.jsonparams) {
        try{
          var params = JSON.parse(req.query.jsonparams),
              qsp =  [];
              
          for(var key in params) {
            qsp.push(encodeURIComponent(key) + '=' + encodeURIComponent(params[key]));
          }
          
          if(qsp.length)
            qs = '?' + qsp.join('&')
        } catch(e){
          
        }
      }
      req.session.redirectAfterLogin = req.query.next + qs;
      
      console.log(req.query, req.params, req.session)
    }
    
    auth.passport.authenticate('google',  { scope: 'https://www.googleapis.com/auth/plus.login' })(req, res, next)
  });

clientRouter.route('/auth/google/callback')
  .get(function (req, res, next) {
    auth.passport.authenticate('google', function(err, user, info) {
      //console.log('user', user); // handle errors
      req.logIn(user, function(err) {
        if (err)
          return next(err);
        if(req.session.redirectAfterLogin) {
          console.log('redirect to', req.session.redirectAfterLogin)
          return res.redirect('/#' + req.session.redirectAfterLogin)
        }
        return res.redirect('/');
      });
    })(req, res, next)
  });

clientRouter.route('/media/:path/:file')
  .get(function (req, res, next) {
    var filename = path.join(settings.paths.media, req.params.path, req.params.file);
    res.sendFile(filename, {root: path.isAbsolute(settings.paths.media)?'':__dirname}, function (err) {
      if(err) {
        res.status(err.status).end();
      }
    });
  })

clientRouter.route('/media/:file')
  .get(function (req, res, next) {
    var filename = path.join(settings.paths.media, req.params.file);
    res.sendFile(filename, {root: path.isAbsolute(settings.paths.media)?'':__dirname}, function (err) {
      if(err) {
        res.status(err.status).end();
      }
    });
  })
/*
  serving Tiles for the specified path
  Note that settings.path.media should have a tile folder
  tiles/{file}/{z}/{y}/{x}.jpg"

*/
clientRouter.route('/tiles/:file/:z(\\d+)/:y(\\d+)/:x(\\d+\.jpg)')
  .get(function (req, res, next) {
    var filename = path.join(settings.paths.media, 'tiles', req.params.file, req.params.z, req.params.y, req.params.x);
    console.log('requesting:', filename)
    res.sendFile(filename, {root: path.isAbsolute(settings.paths.media)?'':__dirname}, function (err) {
      if(err) {
        res.status(err.status).end();
      }
    });
  })

clientRouter.route('/txt/:file')
  .get(function (req, res, next) {
    var filename = path.join(settings.paths.txt, req.params.file);
    res.sendFile(filename, {root: __dirname}, function (err) {
      if(err) {
        res.status(err.status).end();
      }
    });
  })

clientRouter.route('/txt/:path/:file')
  .get(function (req, res, next) {
    var filename = path.join(settings.paths.txt, req.params.path, req.params.file);
    res.sendFile(filename, {root: __dirname}, function (err) {
      if(err) {
        res.status(err.status).end();
      }
    });
  });


/*

  Api router configuration
  ===
  
  Middleware to use for all api requests.
  If settings.allowUnauthenticatedRequests is set in settings module
  and settings.env is set to 'development' it allows authentication free
  api requests (e.g. to performance tuning issues)

*/
apiRouter.use(function (req, res, next) {
  if(req.isAuthenticated() || (settings.allowUnauthenticatedRequests && settings.env == 'development')) {
    return next();
  } else
    return res.error(403);
});

// OPTIN enable cache if required
if(cache) {
  apiRouter.use(function (req, res, next) {
    var cachename = getCacheName(req);

    res.use_express_redis_cache = req.path.indexOf('/user') == -1 && req.method == 'GET';

    // console.log(cachename,'use cache',res.use_express_redis_cache);
    cache.route({
      name: cachename,
      expire: _.isEmpty(req.query)? 60: 40,
    })(req, res, next);
  })
};

// api index
apiRouter.route('/').
  get(function(req, res) { // test route to make sure everything is working (accessed at GET http://localhost:8080/api)
    res.ok({ message: 'hooray! welcome to our api!' });   
  });

apiRouter.route('/another').
  get(function(req, res) { // test route to make sure everything is working (accessed at GET http://localhost:8080/api)
    res.ok({ message: 'hooray! another!' });   
  });


// face recognition tests
apiRouter.route('/alchemyapi/image-face-tags')
  .post(ctrl.alchemyapi.imageFaceTags.url)

apiRouter.route('/rekognition/face-detect')
  .post(ctrl.rekognition.faceDetect)

apiRouter.route('/rekognition/face-search')
  .post(ctrl.rekognition.faceSearch)

apiRouter.route('/skybiometry/face-detect')
  .post(ctrl.skybiometry.faceDetect)


/*

  Registering routes ...
  ======================

*/
app.use('/', clientRouter); // client router
app.use('/api', apiRouter); // api endpoint. we should be auth to pass this point.


/*

  Controller: user
  ----------------
  
  Cfr. controllers/user.js
  Cfr Neo4j queries: [@todo]
  
*/
apiRouter.route('/user/session')// api session info
  .get(ctrl.user.session)
apiRouter.route('/user/pulsations') // return just the number
  .get(ctrl.user.pulsations)
apiRouter.route('/user/pulse') // return just the number
  .get(ctrl.user.pulse)
apiRouter.route('/user/noise') // return just the number
  .get(ctrl.user.noise)
apiRouter.route('/user/task/:what(unknownpeople|resourcelackingdate)') // return the task to be performed number
  .get(ctrl.user.task)


apiRouter.route('/user/:id([\\da-z\\-]+)/related/resource') // api session info
  .get(ctrl.user.getRelatedResources)
apiRouter.route('/user/:id([\\da-z\\-]+)/related/resource/graph') // api session info
  .get(ctrl.user.getRelatedResourcesGraph)
  

/*

  Controller: inquiry
  -------------------
  
  Cfr. controllers/inquiry.js
  Cfr Neo4j queries: queries/inquiry.cyp
  
*/
apiRouter.route('/inquiry')
  .get(ctrl.inquiry.getItems)
apiRouter.route('/inquiry/:id([\\da-z\\-]+)')
  .get(ctrl.inquiry.getItem)
apiRouter.route('/inquiry/:id([\\da-z\\-]+)/related/comment') // POST
  .post(ctrl.inquiry.createComment)
  .get(ctrl.inquiry.getRelatedComment)


/*

  Controller: issue
  -------------------
  
  Cfr. controllers/issue.js
  Cfr Neo4j queries: queries/issue.cyp
  
*/
apiRouter.route('/issue')
  .get(ctrl.issue.getItems)
apiRouter.route('/issue/:id([\\da-z\\-]+)')
  .get(ctrl.issue.getItem)
apiRouter.route('/issue/:id([\\da-z\\-]+)/upvote')
  .post(ctrl.issue.upvote)
apiRouter.route('/issue/:id([\\da-z\\-]+)/downvote')
  .post(ctrl.issue.downvote)



/*

  Controller: inquiry
  -------------------
  
  Cfr. controllers/inquiry.js
  Cfr Neo4j queries: queries/inquiry.cyp
  
*/
apiRouter.route('/comment/:id([\\da-z\\-]+)/upvote')
  .post(ctrl.comment.upvote)
apiRouter.route('/comment/:id([\\da-z\\-]+)/downvote')
  .post(ctrl.comment.downvote)

/*

  Controller: resource
  ----------------------
  
  Cfr. controllers/resource.js
  Cfr Neo4j queries: queries/resource.cyp
  
*/
apiRouter.route('/resource')
  .get(ctrl.resource.getItems)
apiRouter.route('/resource/timeline')
  .get(ctrl.resource.getTimeline)
apiRouter.route('/resource/:id([\\d,]+)')
  .get(ctrl.resource.getItem)
apiRouter.route('/resource/:id([\\da-z\\-]+)/related/resource')
  .get(ctrl.resource.getRelatedItems)
apiRouter.route('/resource/:id([\\da-z\\-]+)/related/comment') // POST
  .post(ctrl.resource.createComment)
apiRouter.route('/resource/:id([\\da-z\\-]+)/related/inquiry')
  .post(ctrl.resource.createInquiry)
  .get(ctrl.resource.getRelatedInquiry)
apiRouter.route('/resource/:id([\\da-z\\-]+)/related/:entity(person|location|organization)')
  .get(ctrl.resource.getRelatedEntities)
  .post(ctrl.resource.createRelatedEntity)
apiRouter.route('/resource/:id([\\da-z\\-]+)/related/:action(annotate)')
  .get(ctrl.resource.getRelatedActions)
apiRouter.route('/resource/:id([\\da-z\\-]+)/related/user')
  .get(ctrl.resource.getRelatedUsers)
  .post(ctrl.resource.createRelatedUser)
  .delete(ctrl.resource.removeRelatedUser) 
apiRouter.route('/resource/:id([\\da-z\\-]+)/related/issue')
  .post(ctrl.resource.createIssue)
  .get(ctrl.resource.getRelatedIssue)
apiRouter.route('/resource/:id([\\da-z\\-]+)/related/:entity(person|location|organization)/graph')
  .get(ctrl.resource.getRelatedEntitiesGraph);
apiRouter.route('/resource/:id([\\da-z\\-]+)/related/resource/graph')
  .get(ctrl.resource.getRelatedResourcesGraph);
apiRouter.route('/resource/:id([\\da-z\\-]+)/related/resource/timeline')
  .get(ctrl.resource.getRelatedResourcesTimeline);


apiRouter.route('/cooccurrences/:entityA(person|theme|location|place|organization)/related/:entityB(person|theme|location|place|organization)') // @todo move to entity controller.
  .get(ctrl.resource.getCooccurrences)
// apiRouter.route('/resource/related/:entity(person|location|organization|theme)/graph')

/*

  Controller: entity
  ----------------------
  
  Cfr. controllers/entity.js
  Cfr Neo4j queries: queries/entity.cyp
  
*/
apiRouter.route('/entity/:id([\\d,]+)')
  .get(ctrl.entity.getItem)
  
apiRouter.route('/entity/:id([\\da-z\\-]+)/related/resource')
  .get(ctrl.entity.getRelatedResources);
  
apiRouter.route('/entity/:id([\\da-z\\-]+)/related/:entity(person|location|theme|organization)')
  .get(ctrl.entity.getRelatedEntities)

apiRouter.route('/entity/:id([\\da-z\\-]+)/related/issue')
  .post(ctrl.entity.createRelatedIssue) // that is, I AGREE
  .delete(ctrl.entity.removeRelatedIssue); // that is, I DISAGREE

apiRouter.route('/entity/:id/related/:entity(person|location|theme|organization)/graph')
  .get(ctrl.entity.getRelatedEntitiesGraph);

apiRouter.route('/entity/:id([\\da-z\\-]+)/related/resource/graph')
  .get(ctrl.entity.getRelatedResourcesGraph);
  
apiRouter.route('/entity/:id([\\da-z\\-]+)/related/resource/timeline')
  .get(ctrl.entity.getRelatedResourcesTimeline);

apiRouter.route('/entity/:id([\\da-z\\-]+)/upvote')
  .post(ctrl.entity.upvote)
  
apiRouter.route('/entity/:id([\\da-z\\-]+)/downvote')
  .post(ctrl.entity.downvote)

apiRouter.route('/entity/:entity_id([\\da-z\\-]+)/related/resource/:resource_id([\\da-z\\-]+)')
  .post(ctrl.entity.createRelatedResource) // create or merge the relationship. The authentified user will become a curator
  .delete(ctrl.entity.removeRelatedResource); // delete the relationship whether possible

apiRouter.route('/entity/:entity_id([\\da-z\\-]+)/related/resource/:resource_id([\\da-z\\-]+)/:action(upvote|downvote|merge)')
  .post(ctrl.entity.updateRelatedResource);

  

/*

  Controller: collection
  ----------------------
  
  Cfr. controllers/collection.js
  Cfr Neo4j queries: queries/collection.cyp
  
*/
apiRouter.route('/collection')
  .get(ctrl.collection.getItems)
  .post(ctrl.collection.create);
apiRouter.route('/collection/:id')
  .get(ctrl.collection.getItem);
apiRouter.route('/collection/:id/graph')
  .get(ctrl.collection.getGraph);
// apiRouter.route('/collection/:id/related/item') // generic items related to a collection
  // .get(ctrl.collection.getRelatedItems)
  // .post(ctrl.collection.addRelatedItems);
apiRouter.route('/collection/:id/related/resources')
  .get(ctrl.collection.getRelatedResources);


/*

  Controller: search & suggest
  ----------------------
  
  This controller answers every typeahead request.
  
  Cfr. controllers/suggest.js
  Cfr Neo4j queries: queries/collection.cyp
  
*/
apiRouter.route('/suggest')
  .get(ctrl.suggest.suggest)

apiRouter.route('/suggest/stats')
  .get(ctrl.suggest.getStats)
apiRouter.route('/suggest/resource')
  .get(ctrl.suggest.getResources)
apiRouter.route('/suggest/:entity(entity|person|location|organization)')
  .get(ctrl.suggest.getEntities)
apiRouter.route('/suggest/resource/graph')
  .get(ctrl.suggest.getResourcesGraph)
apiRouter.route('/suggest/:entity(person|location|organization)/graph')
  .get(ctrl.suggest.getEntitiesGraph)

apiRouter.route('/suggest/all-in-between/:ids(\\d[\\d,]+)/resource/graph')
  .get(ctrl.suggest.getAllInBetweenGraph)
apiRouter.route('/suggest/all-in-between/:ids(\\d[\\d,]+)/resource')
  .get(ctrl.suggest.getAllInBetweenResources)
  
apiRouter.route('/suggest/all-shortest-paths/:ids([\\d,]+)')
  .get(ctrl.suggest.allShortestPaths)
apiRouter.route('/suggest/all-in-between')
  .get(ctrl.suggest.allInBetween)
apiRouter.route('/suggest/unknown-node/:id([\\d,]+)')
  .get(ctrl.suggest.getUnknownNode)
apiRouter.route('/suggest/unknown-nodes/:ids([\\d,]+)')
  .get(ctrl.suggest.getUnknownNodes)
apiRouter.route('/suggest/neighbors/:ids([\\d,]+)')
  .get(ctrl.suggest.getNeighbors)
apiRouter.route('/suggest/shared/:ids([\\d,]+)/resource')
  .get(ctrl.suggest.getSharedResources)
apiRouter.route('/suggest/shared/:ids([\\d,]+)/:entity(person|location|organization)')
  .get(ctrl.suggest.getSharedEntities)

// api proxy for VIAF (they don't have CROSS ORIGIN ...)
apiRouter.route('/suggest/viaf')
  .get(ctrl.suggest.viaf.autosuggest)
apiRouter.route('/suggest/dbpedia')
  .get(ctrl.suggest.dbpedia)


/*
  
  Socket io config
  ------
  
  listen to connections with socket.io.
  Cfr. controllers/*.js to find how io has been implemented.
  
*/
io.use(function (socket, next) {
  sessionMiddleware(socket.request, {}, next);
})
