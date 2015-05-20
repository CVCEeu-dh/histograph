/*

  Welcome to Histograph
  ===

*/
var express       = require('express'),        // call express
    session       = require('express-session'),
    
    settings      = require('./settings'),

    app           = exports.app = express(),                 // define our app using express
    port          = process.env.PORT || 8000,
    server        = app.listen(port),
    io            = require('socket.io')
                      .listen(server),

    auth          = require('./auth'), // auth mechanism with passport
    
    bodyParser    = require('body-parser'),
    cookieParser  = require('cookie-parser'),
    
    fs            = require('fs'),
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

console.log('logs',settings.paths.accesslog);
// configure logger
app.use(morgan('combined', {
  stream: fs.createWriteStream(settings.paths.accesslog, {flags: 'a'})
}));

// configure static files and jade templates
app.use(express.static('./client/src'));
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
    res.render('index', {
      user: req.user || 'anonymous',
      message: 'hooray! welcome to our api!'
    });   
  });

clientRouter.route('/login')
  .post(function (req, res, next) {
    auth.passport.authenticate('local', function(err, user, info) {
      if(err) {
        console.log('login error', err)
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
    return res.ok({
      user: res.user
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
      req.session.redirectAfterLogin = req.query.next;
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
    var file = req.params.file;
    return res.sendFile(settings.mediaPath + '/' + file, { root: __dirname });
  })


/*

  Api router configuration
  ===

*/
apiRouter.use(function (req, res, next) { // middleware to use for all requests
  if (req.isAuthenticated()) {
    // understand some basic query parameters and output metadata about the request
    var params = {};
    
    if(req.query.limit) {
      // check every items here, otherwise block the flow
      
    }
    
    return next();
  }
  
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
  
  
/*

  Controller: resource
  ----------------------
  
  Cfr. controllers/resource.js
  Cfr Neo4j queries: queries/resource.cyp
  
*/
apiRouter.route('/resource')
  .get(ctrl.resource.getItems)
apiRouter.route('/resource')
  .get(ctrl.resource.getItems)
apiRouter.route('/resource/:id')
  .get(ctrl.resource.getItem)
apiRouter.route('/resource/:id/related')
  .get(ctrl.resource.getRelatedItems)
apiRouter.route('/resource/:id/comments') // POST
  .post(ctrl.resource.createComment)
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
apiRouter.route('/entity/:id/related/resources')
  .get(ctrl.entity.getRelatedResources);
apiRouter.route('/entity/:id/related/persons')
  .get(ctrl.entity.getRelatedPersons);
apiRouter.route('/entity/:id/graph')
  .get(ctrl.entity.getGraph);

  
/*

  Controller: collection
  ----------------------
  
  Cfr. controllers/collection.js
  Cfr Neo4j queries: queries/collection.cyp
  
*/
apiRouter.route('/collection')
  .get(ctrl.collection.getItems);
apiRouter.route('/collection/:id')
  .get(ctrl.collection.getItem);
apiRouter.route('/collection/:id/graph')
  .get(ctrl.collection.getGraph);
apiRouter.route('/collection/:id/related/resources')
  .get(ctrl.collection.getRelatedResources);


/*

  Controller: suggest
  ----------------------
  
  This controller answers every typeahead request.
  
  Cfr. controllers/suggest.js
  Cfr Neo4j queries: queries/collection.cyp
  
*/
apiRouter.route('/suggest')
  .get(ctrl.suggest.simple)
apiRouter.route('/suggest/all-shortest-paths/:ids')
  .get(ctrl.suggest.allShortestPaths)
apiRouter.route('/suggest/unknown-node/:id')
  .get(ctrl.suggest.getUnknownNode)
apiRouter.route('/suggest/neighbors/:ids')
  .get(ctrl.suggest.getNeighbors)

/*
  
  Socket io config
  ------
  
  listen to connections with socket.io.
  Cfr. controllers/*.js to find how io has been implemented.
  
*/
io.use(function (socket, next) {
  sessionMiddleware(socket.request, {}, next);
})
