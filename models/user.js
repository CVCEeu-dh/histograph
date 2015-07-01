/**
 * Resource Model for User
 * ======================
 *
 */
var settings  = require('../settings'),
    helpers   = require('../helpers.js'),
    queries   = require('decypher')('./queries/user.cyp'),
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
  create: function(user, next) {
    // enrich user with some field
    var encrypted,
        activation;
        
    encrypted = helpers.encrypt(user.password, {
      from: 'signup.encrypted',
      secret: settings.secret.salt
    });

    activation = helpers.encrypt(user.email, {
      from: 'signup.activation',
      secret: settings.secret.activation, 
      iterations: 23,
      length: 128,
      digest: 'sha1'
    });
      
    _.assign(user, {
      password   : encrypted.key,
      salt       : encrypted.salt,
      status     : user.status || 'disabled',
      activation : activation.key   
    });
     
    neo4j.save(user, 'user', function (err, node) {
      if(err)
        
        next(err);
      else
        next(null, node);
    });
  },
  /*
    This method MUST NOT HAVE an API access.
    user can contain just the email field.
  */
  remove: function(user, next) {
    neo4j.query(queries.remove_user, user, function(err, res) {
      if(err)
        next(err);
      else
        next(null);
    }) 
  }
};