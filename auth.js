/*

  authentication mechanism
  ===

*/
var settings        = require('./settings'),
    helpers         = require('./helpers'),
    passport        = require('passport'),

    LocalStrategy   = require('passport-local').Strategy,
    TwitterStrategy = require('passport-twitter').Strategy;

    decypher        = require('decypher'),

    neo4j           = require('seraph')(settings.neo4j.host);


// auth mechanism: Local
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


/*
  Auth mechanism for twitter
*/
passport.use(new TwitterStrategy({
    consumerKey: settings.TWITTER_CONSUMER_KEY,
    consumerSecret: settings.TWITTER_CONSUMER_SECRET,
    callbackURL: "http://localhost:3000/auth/twitter/callback"
  },
  function(token, tokenSecret, profile, done) {
    // asynchronous verification, for effect...
    //console.log('token', token, 'profile', profile);

    // create or get if any
    neo4j.query('MERGE (k:user { email:{email} }) ON CREATE SET k.status={status}, k.picture={picture}, k.username={username}, k.firstname={firstname}, k.strategy={strategy}, k.about={about}, k.salt={salt}, k.password={password} RETURN k', {
      email: '@' + profile.displayName,
      username: '@' + profile.displayName,
      firstname: '@' + profile.displayName,
      salt: '',
      password:'',
      status: 'enabled',
      strategy: 'twitter',
      about: '' + profile.description,
      picture: profile.photos? profile.photos.pop().value: '',
    },  function(err, res) {
      console.log(err, res);
      if(err)
        return done(err);
      var user = res[0];
      return done(null, user);
    });

    // process.nextTick(function () {
      
    //   // To keep the example simple, the user's Twitter profile is returned to
    //   // represent the logged-in user.  In a typical application, you would want
    //   // to associate the Twitter account with a user record in your database,
    //   // and return that user instead. ()
    //   return done(null, profile);
    // });
  }
));




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