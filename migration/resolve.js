/*
  Enrich neo4j version not having markdown entities (AllAnnotated:No) with boundaries and other
  Check geonames and resolve automatic inquiries on them;
  Check that there are no duplicates for entities: persons
  Check that there are no duplicates for entities: location (geonames plus geocoding api)
  
*/
var settings = require('../settings'),
    migrationSettings = require('./settings'),
    request  = require('request'),
    helpers = require('../helpers'),
    queries = require('decypher')('./queries/migration.resolve.cyp'),
    neo4j = require('seraph')(settings.neo4j.host),
    async = require('async'),
    _ = require('lodash'),
    batch = neo4j.batch();


var queue = async.waterfall([
  /**
    evaluate dodis csv file
  */
  function (next) {

  },
  /**
    Print inquiries for overlapping geo
  */
  function (next) {

  },
  /**
    Remove start_time and end_time properties if they're InvalidDate
    Otherwise it correct it if it is not a number (LONG)
  */
  function (next) {
    neo4j.query('MATCH (n:resource) RETURN n', function(err, nodes) {
      var q = async.queue(function (node, callback) {
        console.log('checking', node.title)
        if(typeof node.start_time == 'string' || typeof node.end_time == 'string' ) {
          if(node.start_time == 'Invalid date' || isNaN(node.start_time)) {
            node.start_time = 'Invalid date';
            node.end_time = 'Invalid date';
            //console.log(node.start_time);
            //callback();
            //node.start_time = undefined
            neo4j.query('MATCH (r) WHERE id(r) = ' + node.id + ' WITH r REMOVE r.start_time RETURN r', function(err, res) {
              
              if(err)
                throw(err)
              
              neo4j.query('MATCH (r) WHERE id(r) = ' + node.id + ' WITH r REMOVE r.end_time RETURN r', function(err, res) {
                if(err)
                  throw(err)
                console.log(res[0])
                callback();
              })

            })

          } else {
            node.start_time = +node.start_time;
            node.end_time = +node.end_time;
         

            neo4j.save(node, function(err, res) {
              console.log(node)
              if(err)
                throw(err)
              console.log(res);
              callback();
            })
          }
          
        } else {
          setTimeout(callback, 10);
        }
        
      }, 1);

      q.push(nodes, function(){ });

      q.drain = function(){
        console.log('all persons have been processed');
        throw 'stop';
        next(null);
      };
      // for(var i = 0; i < nodes.length; i++) {
      //   console.log(nodes[i].start_time, +nodes[i].start_time, typeof nodes[i].start_time)
      //   if(nodes[i].start_time == "1104969600"){
      //     console.log(nodes[i]);
      //     break
      //   }
      //   if(typeof nodes[i].start_time == 'string') {
      //     console.log(nodes[i]);
      //     neo4j.save(nodes[i], function(){

      //     })
      //     // break
      //   }
          
      // }

      
    })
    
  },
  /**
    Get inquiries dealing with incomplete stuffs.
  */
  function (next){
    neo4j.query(queries.get_automatic_inquiries, function(err, res) {
      if(err)
        throw err;
      next(null, _.unique(res, function(d, i) {
        return d.n.id + ' ' + d.r.id;
      }));
    });
  },

  /**
    From result pairs of Inquiries and 
    When an inquiry is resolved, we need to delete it.
  */
  function (results, next) {
    next();
    return;
    console.log('reloving', results.length, 'inquiries');
    // try again with geonames
    var q = async.queue(function (nodes, callback) {
      console.log(nodes.r.title + ' looking for ' + nodes.r.place);
      helpers.geonames(nodes.r.place, function (err, entities) {
        if(err == helpers.IS_EMPTY) {
          helpers.geocoding(nodes.r.place, function (err, entities) {
            if(err == helpers.IS_EMPTY){
              nodes.n.status = 'irreconcilable';
              neo4j.save(nodes.n, function(err) {
                if (err)
                  throw err;
                callback();
              });
              return;
            }
            if(err)
              throw(err)
            helpers.enrichResource(nodes.r, entities[0], function (err, res) {
              if(err)
                throw(err);
              console.log(res);
              nodes.n.status= 'reconciled';
              neo4j.save(nodes.n, function(err) {
                if (err)
                  throw err;
                callback();
              });
              
            });
          });
          return;
        };
        if(err)
          throw(err)
        helpers.enrichResource(nodes.r, entities[0], function (err, res) {
          if(err)
            throw(err);
          nodes.n.status= 'reconciled';
          neo4j.save(nodes.n, function(err) {
            if (err)
              throw err;
            callback();
          });
        });
      })
    }, 1);

    q.push(_.take(results,4), function() {});
    // assign a callback
    q.drain = function() {
       next();
    }
  }], function(){
    console.log('done')
  }
); // end of waterfall;
