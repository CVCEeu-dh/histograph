/*

  authentication mechanism
  ===

*/
var settings        = require('./settings'),
    helpers         = require('./helpers'),
    passport        = require('passport'),

    LocalStrategy   = require('passport-local').Strategy,
    TwitterStrategy = require('passport-twitter').Strategy,
    GoogleStrategy  = require('passport-google-oauth').OAuth2Strategy,
    

    queries        = require('decypher')('./queries/user.cyp'),

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
    callbackURL: settings.baseurl + "/auth/twitter/callback"
  },
  function(token, tokenSecret, profile, done) {
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
  }
));


/*
  Auth mechanism for google
*/
passport.use(new GoogleStrategy({
    clientID: settings.google.clientId,
    clientSecret: settings.google.clientSecret,
    callbackURL:  settings.baseurl + "/auth/google/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    neo4j.query(queries.merge_user, {
      email: 'g@' + profile.id,
      username: profile.displayName + profile.id,
      firstname: profile.displayName,
      gender: profile.gender || '',
      salt: '',
      password:'',
      status: 'enabled',
      strategy: 'google',
      about: '' + profile.description || '',
      picture: profile.photos? profile.photos.pop().value: '',
    },  function(err, res) {
      console.log(err, res);
      if(err)
        return done(err);
      console.log(profile, res)
      var user = res[0];
      return done(null, user);
    });
  }
));



passport.serializeUser(function(user, done) {
  done(null, {
    firstname: user.firstname,
    lastname:  user.lastname,
    email:     user.email,
    username:  user.username,
    id:        user.id,
    picture:   user.picture
  });
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

exports.passport = passport;