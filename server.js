// server.js

// BASE SETUP
// =============================================================================

// call the packages we need
var express      = require('express'),        // call express
    session      = require('express-session'),
    settings     = require('./settings'),
    app          = exports.app = express(),                 // define our app using express
    
    passport     = require('passport'),
    LocalStrategy     = require('passport-local').Strategy,
    
    bodyParser   = require('body-parser'),
    cookieParser = require('cookie-parser'),
    morgan       = require('morgan'),
    
    ctrl         = require('require-all')(__dirname + '/controllers'),

    port         = process.env.PORT || 8080,

    clientRouter = express.Router(),
    apiRouter    = express.Router();        // set our port

// configure logger
app.use(morgan('dev'));

// configure static files and jade templates
app.use(express.static('./client/src'));
app.set('views', './client/views');
app.set('view engine', 'jade');


// configure app to use bodyParser(), this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// configure app to use sessions
app.use(cookieParser());
app.use(session({
  name: 'hg.sid',
  secret: settings.secret,
  trustProxy: false,
  resave: true,
  saveUninitialized: true
}));

// auth mechanism
passport.use(new LocalStrategy(function (username, password, done) {
  console.log(username, password);
  return done(null, {
    username: 'test'
  });
}));

passport.serializeUser(function(user, done) {
  done(null, user.username);
});

passport.deserializeUser(function(id, done) {
  console.log('deserialized');
});

app.use(passport.initialize());
app.use(passport.session());

// enrich express responses
express.response.ok = function(result) {
  return this.json({
    status: 'ok',
    user: res.user,
    result: result
  });
};

express.response.error = function(statusCode, message) {
  return this.status(statusCode).json({
    status: 'error',
    error: {
      code: statusCode,
      message: message
    }
  });
};


/*
  Client router configuration
*/
clientRouter.route('/').
  get(function(req, res) { // test route to make sure everything is working (accessed at GET http://localhost:8080/api)
    res.render('index', { message: 'hooray! welcome to our api!' });   
  });

clientRouter.route('/login')
  .post(
    passport.authenticate('local', {
      successRedirect: '/',
      failureRedirect: '/login'
    }),
    function (req, res) {
      return res.ok({
        user: res.user
      });
    }
  );

clientRouter.route('/logout')
  .get(function(req, res){
    req.logout();
    return res.ok({
      user: res.user
    });
  });

/*

  Api router configuration
  ===

*/
apiRouter.use(function(req, res, next) { // middleware to use for all requests
  if (req.isAuthenticated()) {
    return next();
  }
  return res.error(403);
});

// api index
apiRouter.route('/').
  get(function(req, res) { // test route to make sure everything is working (accessed at GET http://localhost:8080/api)
    res.json({ message: 'hooray! welcome to our api!' });   
  });

// api session info
apiRouter.route('/user/session')
  .get(ctrl.user.session)



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

 Register our routes
 ===

*/
app.use('/', clientRouter); // client router
app.use('/api', apiRouter); // api endpoint


/*

 START THE SERVER and strat listening with socket.io

*/
var server = app.listen(port),
    io = require('socket.io').listen(server);

// import io events otherwise
io.on('connection', function(socket){
  var cookie_string = socket.request.headers.cookie;
  console.log('a user connected', cookie_string);
  

});