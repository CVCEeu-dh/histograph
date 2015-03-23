/*
  Enrich neo4j version not having markdown entities (AllAnnotated:No) with boundaries and other
  Check geonames and resolve automatic inquiries on them.
*/
var settings = require('../settings'),
    request  = require('request'),
    helpers = require('../helpers'),
    queries = require('decypher')('./queries/migration.resolve.cyp'),
    neo4j = require('seraph')(settings.neo4j.host),
    async = require('async'),
    _ = require('lodash'),
    batch = neo4j.batch();


var queue = async.waterfall([
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
