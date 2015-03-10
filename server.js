// server.js

// BASE SETUP
// =============================================================================

// call the packages we need
var express     = require('express'),        // call express
    settings    = require('./settings'),
    app         = exports.app = express(),                 // define our app using express
    bodyParser  = require('body-parser'),
    ctrl        = require('require-all')(__dirname + '/controllers'),

    port = process.env.PORT || 8080,

    router = express.Router();        // set our port

// configure app to use bodyParser(), this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());



router.use(function(req, res, next) { // middleware to use for all requests
    // do logging, redirect in case of unauth request @todo
    next(); // make sure we go to the next routes and don't stop here
});

// api index
router.route('/').
  get(function(req, res) { // test route to make sure everything is working (accessed at GET http://localhost:8080/api)
    res.json({ message: 'hooray! welcome to our api!' });   
  });

// face recognition tests
router.route('/alchemyapi/image-face-tags')
  .post(ctrl.alchemyapi.imageFaceTags.url)

router.route('/rekognition/face-detect')
  .post(ctrl.rekognition.faceDetect)

router.route('/rekognition/face-search')
  .post(ctrl.rekognition.faceSearch)

router.route('/skybiometry/face-detect')
  .post(ctrl.skybiometry.faceDetect)

// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /api
// app.use('/', router); // client
app.use('/api', router);

// START THE SERVER
// =============================================================================
app.listen(port);