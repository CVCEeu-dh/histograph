/*

  authentication mechanism
  ===

*/
var settings       = require('./settings'),
    helpers        = require('./helpers'),
    passport       = require('passport'),
    LocalStrategy  = require('passport-local').Strategy,

    decypher       = require('decypher'),


    neo4j          = require('seraph')(settings.neo4j.host);

// auth mechanism
passport.use(new LocalStrategy(function (username, password, done) {
  // get user having username or email = username and check if encription matches and check if 
  neo4j.query('Match(user:user) WHERE user.email = {nickname} OR user.username = {nickname} RETURN user',{
    nickname: username
  }, function(err, res) {
    if(err)
      return done(err)
    
    if(!res.length) 
      return done({reason: 'user not found'}) // the real reason, for loggin purposes. user not found
    
    
    var user = res[0];
    
    user.isValid = helpers.comparePassword(password, user.password, {
      from: 'localstrategy',
      secret: settings.secret.salt, 
      salt: user.salt
    });

    if(!user.isValid)
      return done({reason: 'credentials not matching'});

    if(user.status != 'enabled')
      return done({reason: 'user is NOT active, its status should be enabled', found: user.status});

    return done(null, user)
    
    
  })
}));

passport.serializeUser(function(user, done) {
  done(null, {
    firstname: user.firstname,
    lastname:  user.lastname,
    email:     user.email,
    username:  user.username,
    id:        user.id
  });
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

exports.passport = passport;