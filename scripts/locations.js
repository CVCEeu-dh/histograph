/**
  Custom entity:location reconciliation.
  Create a name for those entities not having a name;
  Merge entities by using the same lat long comparison.
*/
var settings   = require('../settings'),
    helpers    = require('../helpers.js'),
    
    neo4j = require('seraph')(settings.neo4j.host),
    async = require('async'),
    _     = require('lodash');


/*
  This queue for each entity:location NOT HAVING a name field

*/
var queue = async.waterfall([
    // get location from geocode not having a name
    function (next) {
      neo4j.query('MATCH (n:`location`) WHERE has(n.geocode_id) AND not(has(n.name)) RETURN n  ORDER BY n.geocode_countryName LIMIT 1000', function (err, locations) {
        if(err)
          throw err;
        
        next(null, _.take(locations, locations.length))
      });
    },
    // given the location, try to put the name
    function (locations, next) {
      var uncertainty = 0;

      var q = async.queue(function (location, nextLocation) {
        location.name = _.without([
          location.geocode_toponymName,
          location.geocode_countryName
        ], '').join(', ');

        console.log(location.name, location.name.length, Math.round((locations.length - q.length())/locations.length * 10000)/100, '%' )
        if(location.name.length == 0) {
          location.name = location.geocode_formatted_address;
          location.is_uncertain = true;
          uncertainty++;
        }
        
        neo4j.save(location, function(err, nodes) {
          if(err)
            throw err;
          nextLocation()
        });

      }, 2);
      q.push(locations)
      q.drain = function() {
        console.log(':: uncertainty level:', uncertainty, 'over', locations.length)
        next();
      }
    },

    // the same queue, for geonames
    function (next) {
      neo4j.query('MATCH (n:`location`) WHERE has(n.geonames_id) AND not(has(n.name)) RETURN n  ORDER BY n.geonames_countryName LIMIT 1000', function (err, locations) {
        if(err)
          throw err;
        
        next(null, _.take(locations, locations.length))
      });
    },

    function (locations, next) {
      var uncertainty = 0;

      var q = async.queue(function (location, nextLocation) {
        location.name = _.without([
          location.geonames_toponymName,
          location.geonames_countryName
        ], '').join(', ');

        console.log(location.name, location.name.length, Math.round((locations.length - q.length())/locations.length * 10000)/100, '%' )
        if(location.name.length == 0) {
          console.log(location);
          location.is_uncertain = true;
          uncertainty++;
        }
        
        neo4j.save(location, function(err, nodes) {
          if(err)
            throw err;
          nextLocation()
        });
      }, 2);
      q.push(locations)
      q.drain = function() {
        console.log(':: uncertainty level:', uncertainty, 'over', locations.length)
        next();
      }
    },
  ], function(){
    console.log('completed');
  });