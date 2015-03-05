// server.js

// BASE SETUP
// =============================================================================

// call the packages we need
var express     = require('express'),        // call express
    app         = express(),                 // define our app using express
    bodyParser  = require('body-parser'),
    controllers = require('body-parser'),

    port = process.env.PORT || 8080,

    router = express.Router();        // set our port


// configure app to use bodyParser(), this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());



router.use(function(req, res, next) { // middleware to use for all requests
    // do logging
    console.log('Something is happening.');
    next(); // make sure we go to the next routes and don't stop here
});


router.get('/', function(req, res) { // test route to make sure everything is working (accessed at GET http://localhost:8080/api)
    res.json({ message: 'hooray! welcome to our api!' });   
});

// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /api
// app.use('/', router); // client
app.use('/api', router);

// START THE SERVER
// =============================================================================
app.listen(port);