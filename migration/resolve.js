/*
  Enrich neo4j version not having markdown entities (AllAnnotated:No) with boundaries and other
  Check geonames and resolve automatic inquiries on them.
*/
var settings = require('../settings'),
    request  = require('request'),
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
    // try again with geonames
    var q = async.queue(function (nodes, callback) {
      console.log(nodes.r.title + ' looking for ' + nodes.r.place);
      
      request.get({
        url: 'http://api.geonames.org/searchJSON?q=' + encodeURIComponent(nodes.r.place)  + '&style=long&maxRows=10&username=' + settings.geonames.username,
        json:true
      }, function (err, res, body) {
        if(err)
          throw err;
        if(!body.geonames || !body.geonames.length) {
          console.log('  ... no geonames found, try with geocoding api');
          // back to geocode babe
          request.get({
            url: 'https://maps.googleapis.com/maps/api/geocode/json?key=' + settings.geocoding.key + '&address=' + encodeURIComponent(nodes.r.place),
            json:true
            }, function (err, res, body) {
              if(err)
                throw err;
              
              if(!body.results.length) {
                console.log('  ... no geoceode ! found, notify someone');
                callback();
                return;
              };
              console.log(body.results[0].formatted_address, 'for', nodes.r.place);
              // update the nodee
              neo4j.query(queries.merge_geocoding_entity, {
                place_id: body.results[0].place_id,
                q: 'https://maps.googleapis.com/maps/api/geocode/json?address=' + encodeURIComponent(nodes.r.place),
                countryName: _.find(body.results[0].address_components, function(d){return d.types[0] == 'country'}).long_name,
                countryId: _.find(body.results[0].address_components, function(d){return d.types[0] == 'country'}).short_name,
                toponymName: _.find(body.results[0].address_components, function(d){return d.types[0] == 'country'}).long_name,
                formatted_address : body.results[0].formatted_address,
                lat: body.results[0].geometry.location.lat,
                lng: body.results[0].geometry.location.lng,
                ne_lat: body.results[0].geometry.bounds.northeast.lat,
                ne_lng: body.results[0].geometry.bounds.northeast.lng,
                sw_lat: body.results[0].geometry.bounds.southwest.lat,
                sw_lng: body.results[0].geometry.bounds.southwest.lng,
              }, function(err, resultss) {
                if(err) {
                  console.log(err);
                  throw err;
                }
                console.log('resultss', resultss);
                callback();
                //batch.relate(n, 'helds_in', nodes[0], {upvote: 1, downvote:0});
                //nextReconciliation(null, n, v);
              });
          }); // end of get geocode
        } else {
          callback();
        } 
      })

      
    }, 1);

    q.push(_.take(results,1), function() {});
    // assign a callback
    q.drain = function() {
       next();
    }
  }], function(){
    console.log('done')
  }
); // end of waterfall;
