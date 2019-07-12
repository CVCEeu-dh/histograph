/* eslint-disable */

/*
  Helpers for model scripts. 
  ===
  Common flow for rest API (e.g, get a list of items and get total_count)
  They require a options.suffix for some
*/
var settings = require('../settings'),
    helpers  = require('../helpers'),
    parser  = require('../parser'),
    async    = require('async'),

    _        = require('lodash'),
    neo4j    = require('seraph')(settings.neo4j.host);
    
    
module.exports = {
  /*
    generate basic model function: getItem, getItems
    options:{
      model: 'issue',
      pluralize: 'issues',
      queries: <decypher object>
    }
  */
  generate: function(options) {
    'use-strict';

    var queries = options.queries;
    
    /*
      Perform a query given a prefix
    */
    function cook(prefix, item, next) {
      var now = helpers.now(),
          query = parser.agentBrown(queries[prefix + '_' +options.model], item);
      
      neo4j.query(query, _.assign({
        exec_date: now.date,
        exec_time: now.time
      }, item), function (err, nodes) {
        if(err || !nodes.length) {
          next(err||helpers.IS_EMPTY);
          return;
        }
        next(null, nodes[0]);
      })
    };

    return {
      /*
        Get a single item.
        @param item - object that MUST have a property 'id', neo4j identifier
      */
      get: function(item, next) {
        neo4j.query(queries['get_'+options.model], {
          id: item.uuid
        }, function (err, node) {
          if(err) {
            next(err);
            return;
          }
          if(!node.length) {
            next(helpers.IS_EMPTY);
            return;
          }
          node[0].answers = _.filter(node[0].answers, 'id')
          // select current abstract based on the language chosen, fallback to english
          next(null, node[0]);
        })
      },
      /*
        Create.
        Return the object having at least the neo4j identifier and the properties
      */
      create: function(item, next) {
        cook('create', _.assign({
          uuid: helpers.uuid()
        }, item), next);
      },
      /*
        Update or merge
      */
      update: function(item, next) {
        cook('update', item, next);
      },

      merge: function(item, next) {
        cook('merge', _.assign({
          uuid: helpers.uuid()
        }, item), next);
      },
      /*
        Get a lot of basic item, with sorting orders.
        Please provide the corresponding query: e.g for model 'issue',
        the queries get_issues and count_issues should be available.

        @param params - object that must contain limit and offset at least
      
      */
      getMany: function(params, next) {
        module.exports.getMany({
          queries: {
            items: queries['get_'+options.pluralize],
            total_count: queries['count_'+options.model]
          },
          params: params
        }, next);
      },
      /*
        Remove the selected item according to the DELETE query
        provided. e.g for model 'issue',
        the queries remove_issue should be available.
        @param item - object that MUST have a property 'id', neo4j identifier
      */
      remove: function(item, next) {
        neo4j.query(queries['remove_' + options.model], {
          id: item.id
        }, next);
      }
    }
  },
  /*
    Usage in models/*.js scripts:
    var models  = require('../helpers/models'),
        queries = require('decypher')('./queries/activity.cyp')
    ...
    module.exports: {
      getMany: function(params, next) {
        models.getMany({
          queries: {
            items: queries.get_activities,
            total_count: queries.count_activities
          },
          params: params
        }, function (err, results) {
          if(err)
            next(err)
          else
            next(null, results);
        });
      }
    }
  */
  getMany: function(options, next) {
    async.series([
      function count_items (callback) {
        var query = parser.agentBrown(options.queries.count_items, options.params);
        neo4j.query(query, options.params, function (err, result) {
          if(err) {
            callback(err);
          } else if(!isNaN(result.count_items)){
            callback(null, {
              total_items: result.count_items
            })
          } else {
            callback(null, {
              groups: result,
              total_items: _.sum(result.map(r => r.count_items)) 
            });
          }
        })
      },
      function items (callback) {
        var query = parser.agentBrown(options.queries.items, options.params);
        neo4j.query(query, options.params, callback);
      }
    ], function (err, results) {
      if(err)
        next(err);
      else
        next(null, {
          count_items: results[0],
          items: results[1],
        });
    });
  }
}