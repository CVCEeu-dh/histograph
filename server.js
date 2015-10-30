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
    env           = process.env.NODE_ENV || 'development'
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

    

    clientRouter = express.Router(),
    apiRouter    = express.Router(),

    _            = require('lodash');        // set our port


// initilalize session middleware
var sessionMiddleware = session({
  name: 'hg.sid',
  secret: settings.secret.cookie,
  trustProxy: false,
  resave: true,
  saveUninitialized: true
})

console.log('logs:', settings.paths.accesslog);
console.log('env: ', env);

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
    user: this.req.user,
    result: result
  };
  
  if(info)
    res.info = info;
  
  if(warnings)
    res.warnings = warnings
  
  return this.json(res);
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
    res.render('production' == env? 'index-lite':'index', {
      user: req.user || 'anonymous',
      message: 'hooray! welcome to our api!'
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
    res.render('index', {
      user: req.user || 'anonymous',
      message: 'hooray! welcome to our api!'
    });
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
  .get(auth.passport.authenticate('google',  { scope: 'https://www.googleapis.com/auth/plus.login' }));

clientRouter.route('/auth/google/callback')
  .get(function (req, res, next) {
    auth.passport.authenticate('google', function(err, user, info) {
      //console.log('user', user); // handle errors
      req.logIn(user, function(err) {
        if (err)
          return next(err);
        return res.redirect('/');
      });
    })(req, res, next)
  });

clientRouter.route('/media/:file')
  .get(function (req, res, next) {
    var filename = path.join(settings.paths.media, req.params.file);
    res.sendFile(filename, {root: __dirname}, function (err) {
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

*/
apiRouter.use(function (req, res, next) { // middleware to use for all requests
  if(req.isAuthenticated())
    return next();
  else
    return res.error(403);
});

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
apiRouter.route('/user/pulse') // api session info
  .get(ctrl.user.pulse)
  

/*

  Controller: inquiry
  -------------------
  
  Cfr. controllers/inquiry.js
  Cfr Neo4j queries: queries/inquiry.cyp
  
*/
apiRouter.route('/inquiry')
  .get(ctrl.inquiry.getItems)
apiRouter.route('/inquiry/:id(\\d+)')
  .get(ctrl.inquiry.getItem)
apiRouter.route('/inquiry/:id(\\d+)/related/comment') // POST
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
apiRouter.route('/issue/:id(\\d+)')
  .get(ctrl.issue.getItem)
apiRouter.route('/issue/:id(\\d+)/upvote')
  .post(ctrl.issue.upvote)
apiRouter.route('/issue/:id(\\d+)/downvote')
  .post(ctrl.issue.downvote)



/*

  Controller: inquiry
  -------------------
  
  Cfr. controllers/inquiry.js
  Cfr Neo4j queries: queries/inquiry.cyp
  
*/
apiRouter.route('/comment/:id(\\d+)/upvote')
  .post(ctrl.comment.upvote)
apiRouter.route('/comment/:id(\\d+)/downvote')
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
apiRouter.route('/resource/:id(\\d+)/related/resource')
  .get(ctrl.resource.getRelatedItems)
apiRouter.route('/resource/:id(\\d+)/related/comment') // POST
  .post(ctrl.resource.createComment)
apiRouter.route('/resource/:id(\\d+)/related/inquiry')
  .post(ctrl.resource.createInquiry)
  .get(ctrl.resource.getRelatedInquiry)
apiRouter.route('/resource/:id(\\d+)/related/:entity(person|location|organization)')
  .get(ctrl.resource.getRelatedEntities)
apiRouter.route('/resource/:id(\\d+)/related/user')
  .get(ctrl.resource.getRelatedUsers)
  .post(ctrl.resource.createRelatedUser) 
apiRouter.route('/resource/:id(\\d+)/related/issue')
  .post(ctrl.resource.createIssue)
  .get(ctrl.resource.getRelatedIssue)
apiRouter.route('/resource/:id(\\d+)/related/:entity(person|location|organization)/graph')
  .get(ctrl.resource.getRelatedEntitiesGraph);
apiRouter.route('/resource/:id(\\d+)/related/resource/graph')
  .get(ctrl.resource.getRelatedResourcesGraph);
apiRouter.route('/resource/:id(\\d+)/related/resource/timeline')
  .get(ctrl.resource.getRelatedResourcesTimeline);
apiRouter.route('/cooccurrences') // @todo move to entity controller.
  .get(ctrl.resource.getCooccurrences)


/*

  Controller: entity
  ----------------------
  
  Cfr. controllers/entity.js
  Cfr Neo4j queries: queries/entity.cyp
  
*/
apiRouter.route('/entity/:id')
  .get(ctrl.entity.getItem)
  
apiRouter.route('/entity/:id/related/resource')
  .get(ctrl.entity.getRelatedResources);
  
apiRouter.route('/entity/:id(\\d+)/related/:entity(person|location|organization)')
  .get(ctrl.entity.getRelatedEntities)
  
apiRouter.route('/entity/:id/related/:entity(person|location|organization)/graph')
  .get(ctrl.entity.getRelatedEntitiesGraph);

apiRouter.route('/entity/:id(\\d+)/related/resource/graph')
  .get(ctrl.entity.getRelatedResourcesGraph);
  
apiRouter.route('/entity/:id(\\d+)/upvote')
  .post(ctrl.entity.upvote)
  
apiRouter.route('/entity/:id(\\d+)/downvote')
  .post(ctrl.entity.downvote)
  
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
apiRouter.route('/suggest/entity')
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
apiRouter.route('/suggest/shared-resources/:ids([\\d,]+)')
  .get(ctrl.suggest.getSharedResources)

/*
  
  Socket io config
  ------
  
  listen to connections with socket.io.
  Cfr. controllers/*.js to find how io has been implemented.
  
*/
io.use(function (socket, next) {
  sessionMiddleware(socket.request, {}, next);
})
