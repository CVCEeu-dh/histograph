/**
 * Resource Model for User
 * ======================
 *
 */
var settings  = require('../settings'),
    helpers   = require('../helpers'),
    models    = require('../helpers/models'),
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
    var now = helpers.now(), 
        encrypted,
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
      last_notification_date:   now.date,
      last_notification_time:   now.time,
      password              : encrypted.key,
      salt                  : encrypted.salt,
      status                : user.status || 'disabled',
      activation            : activation.key   
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
    neo4j.query(queries.remove_user, user, function (err, res) {
      if(err)
        next(err);
      else
        next(null);
    }) 
  },
  
  /*
    This method return a list of live items
  */
  pulse: function(user, params, next) {
    models.getMany({
      queries: {
        count_items: queries.count_pulse,
        items: queries.get_pulse
      },
      params: _.assign({
        username: user.username
      }, params)
    }, function (err, results) {
      if(err) {
        console.log(err)
        next(err);
        return;
      }
      next(null, results.items, results.count_items);
    });
  },

  /*
    This method return just the amount of notification, to be called on 
  */
  pulsations: function(user, next) {
    neo4j.query(queries.count_pulse, {
      username: user.username
    }, next);
  },
  /*
    Return a list of last touched resources

    Test query with user id:
    node .\scripts\manage.js --task=query
        --cypher=user/get_related_resources
        --id=31507 --limit=10 --offset=0
  
  */
  getRelatedResources: function(user, params, next) {
    models.getMany({
      queries: {
        count_items: queries.count_related_resources,
        items: queries.get_related_resources
      },
      params: params
    }, function (err, results) {
      if(err) {
        console.log(err)
        next(err);
        return;
      }
      next(null, results.items, results.count_items);
    });
  },
  /*
    Return the bipartite graph with nodes and edges
    for the given user's related resoruces (with entities appearing in between).

    @param user - object containing at least the numeric user id
    @param params - object contianing the params ffor the cypher query
  */
  getRelatedResourcesGraph: function(user, params, next) {
    helpers.cypherGraph(queries.get_related_resources_graph, _.assign({}, user, params), function (err, graph) {
      if(err)
        next(err);
      else
        next(null, graph);
    });
  }
};