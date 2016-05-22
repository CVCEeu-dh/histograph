/**
 * Resource Model for User
 * ======================
 *
 */
var settings  = require('../settings'),
    helpers   = require('../helpers'),
    parser    = require('../parser'),
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
    lastname    : 'Way',
    strategy   : 'local', // the strategy passport who creates his account, like local or google or twitter
    about      : ''
  */
  create: function(user, next) {
    // enrich user with some field
    var now = helpers.now(),
        uuid = helpers.uuid(),
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
      uuid                   : uuid,                 
      exec_date              : now.date,
      exec_time              : now.time,
      password               : encrypted.key,
      salt                   : encrypted.salt,
      status                 : user.status || 'disabled',
      activation             : activation.key   
    });
     
    neo4j.query(parser.agentBrown(queries.merge_user, user), user, function (err, node) {
      if(err)
        next(err);
      else
        next(null, node[0]);
    });
  },

  /*
    Validate user agains username and password
  */
  check: function(user, next) {
    neo4j.query(queries.get_matching_user, user, function(err, nodes) {
      if(err || !nodes.length){
        next(err || helper.IS_EMPTY);
        return;
      }
      var _user = nodes[0];

      _user.isValid = helpers.comparePassword(user.password, _user.props.password, {
        from: 'localstrategy',
        secret: settings.secret.salt, 
        salt: _user.props.salt
      });

      if(!_user.isValid) {
        next(helpers.IS_EMPTY); // credential not matching
      } else {
        next(null, _user);
      }
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
    This method return a list of least curated/liked resources
  */
  noise: function(user, params, next) {
    models.getMany({
      queries: {
        count_items: queries.count_noise,
        items: queries.get_noise
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
    Return a crowdsourcing task 
    @param params - object containing the 'what' property describing the task to be performed:
                    count_crowdsourcing_unknown_people 
  */
  task: function(user, params, next) {
    async.waterfall([
      function getSeeds(callback) {
        neo4j.query(queries['count_crowdsourcing_'+params.what], callback);
      },
      function getTask(result, callback) {
        if(result.count_items == 0)
          callback(helpers.IS_EMPTY);
        else
          neo4j.query(queries['get_crowdsourcing_'+params.what], {
            offset: Math.round(Math.random()*((result.count_items/4)-1)),
            limit: 1
          }, callback);
      }
    ], next);
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
        console.log('getRelatedResources',err)
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
  },
  /*
    Return the timeline for the user favourite resources.
  */
  getRelatedResourcesTimeline: function(user, params, next) {
    helpers.cypherTimeline(queries.get_related_resources_timeline, _.assign(params, user), next);
  },
  /*
    Return the facets for the user favourite resources.
  */
  getRelatedResourcesElastic: function(user, params, next) {
    _.assign(params, user);
    var query = parser.agentBrown(queries.get_related_resources_elastic, params);
    neo4j.query(query, params, next);
  }
};