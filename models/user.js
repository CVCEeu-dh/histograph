/**
 * Resource Model for User
 * ======================
 *
 */
var settings  = require('../settings'),
    helpers   = require('../helpers.js'),
    
    neo4j     = require('seraph')(settings.neo4j.host),
    _         = require('lodash');

module.exports = {
  /*
    Create a new user into the database.
    User should have the following fields:
    
    username   : 'hello-world',
    password   : 'WorldHello',
    email      : 'world@globetrotter.it',
    firstname  : 'Milky',
    lastame    : 'Way',
    strategy   : 'local', // the strategy passport who creates his account, like local or google or twitter
    about      : ''
  */
  create: function(user, status, next) {
    // enrich user with some field
    var encrypted,
        activation;
        
    encrypted = helpers.encrypt(req.body.password, {
      from: 'signup.encrypted',
      secret: settings.secret.salt
    });

    activation = helpers.encrypt(req.body.email, {
      from: 'signup.activation',
      secret: settings.secret.activation, 
      iterations: 23,
      length: 128,
      digest: 'sha1'
    });
      
    _.assign(user, {
      password   : encrypted.key,
      salt       : encrypted.salt,
      status     : status || 'disabled',
      activation : activation.key   
    });
     
    neo4j.save(user, 'user', function (err, node) {
      if(err)
        next(err);
      else
        next(node);
    });
  }   
};