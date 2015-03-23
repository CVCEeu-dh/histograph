/**
  A bunch of useful functions
*/
var crypto   = require('crypto'),
    settings = require('./settings'),
    request  = require('request'),
    _        = require('lodash'),
    moment   = require('moment'),

    IS_EMPTY = 'is_empty',

    reconcile  = require('decypher')('./queries/migration.resolve.cyp'),
    neo4j      = require('seraph')(settings.neo4j.host);

module.exports = {
  IS_EMPTY: IS_EMPTY,
  /**
    Handle causes and stacktraces provided by seraph
    @err the err string provided by cypher
    @res the express response object
  */
  cypherError: function(err, res) {
    if(err && err.message) {
        var result = JSON.parse(err.message);

        if(result.cause)
          return res.error(400, result.cause);

        return res.error(500, result);
    }
    return res.error(400, err.message);
  },
  /**
    encrypt a password ccording to local settings secret and a random salt.
  */
  encrypt: function(password, options) {
    var configs = _.assign({
          secret: '',
          salt: crypto.randomBytes(16).toString('hex'),
          iterations: 4096,
          length: 256,
          digest: 'sha256'
        }, options || {});
    //console.log(configs)
    return {
      salt: configs.salt,
      key: crypto.pbkdf2Sync(
        configs.secret,
        configs.salt + '::' + password,
        configs.iterations,
        configs.length,
        configs.digest
      ).toString('hex')
    };
  },

  comparePassword:  function(password, encrypted, options) {
    return this.encrypt(password, options).key == encrypted;
  },


  /**
    Create a Viaf entity:person node for you
   */
  viaf: function(fullname, next) {
    var viafURL = 'http://www.viaf.org/viaf/AutoSuggest?query='
        + encodeURIComponent(fullname);

    request.get({
      url: viafURL,
      json:true
    }, function (err, res, body) {
      if(err) {
        next(err);
        return;
      }

      //console.log(body);
      next(IS_EMPTY);
      // neo4j.query(reconcile.merge_geonames_entity, _.assign({
      //     q: geonamesURL,
      //     countryId: '',
      //     countryCode: ''
      //   }, body.geonames[0]),
      //   function(err, nodes) {
      //     if(err) {
      //       next(err);
      //       return;
      //     }
      //     next(null, nodes);
      //   }
      // );
    });
  },


  /**
    Create a Geocoded entity:location Neo4j node for you. The Neo4J MERGE result will be
    returned as arg for the next function next(null, result)
    
    Call the geocode api according to your current settings: make sure you use the proper
    
      settings.geocoding.key

    Handle err response; it creates nodes frm the very first address found.
    @next your callback with(err, res)
  */
  geonames: function(address, next) {
    var geonamesURL = 'http://api.geonames.org/searchJSON?q='
        + encodeURIComponent(address)
        + '&style=long&maxRows=10&username=' + settings.geonames.username;

    request.get({
      url: geonamesURL,
      json:true
    }, function (err, res, body) {
      if(err) {
        next(err);
        return;
      }

      if(!body.geonames || !body.geonames.length) {
        next(IS_EMPTY);
        return;
      };
      console.log(body.geonames[0].toponymName, body.geonames[0].countryName, 'for', address);
      neo4j.query(reconcile.merge_geonames_entity, _.assign({
          geonames_id: body.geonames[0].geonameId,
          q: geonamesURL,
          countryId: '',
          countryCode: ''
        }, body.geonames[0]),
        function(err, nodes) {
          if(err) {
            next(err);
            return;
          }
          next(null, nodes);
        }
      );
    });
  },

  /**
    Create a Geocoded entity:location Neo4j node for you. The Neo4J MERGE result will be
    returned as arg for the next function next(null, result)
    
    Call the geocode api according to your current settings: make sure you use the proper
    
      settings.geocoding.key

    Handle err response; it creates nodes frm the very first address found.
    @next your callback with(err, res)
  */
  geocoding: function(address, next) {
    request.get({
      url: 'https://maps.googleapis.com/maps/api/geocode/json?key='
          + settings.geocoding.key
          + '&address=' + encodeURIComponent(address),
      json: true
    }, function (err, res, body) {
      if(err) {
        next(err);
        return;
      }
      
      if(!body.results.length) {
        next(IS_EMPTY);
        return;
      };
      //console.log(body.results[0].formatted_address, 'for', address);
      //console.log(body.results[0].address_components)

      var country = _.find(body.results[0].address_components, function (d){
          return d.types[0] == 'country';
        }),
        locality =  _.find(body.results[0].address_components, function (d){
          return d.types[0] == 'locality';
        });
      
      // update the nodee
      neo4j.query(reconcile.merge_geocoding_entity, {
        geocode_id: body.results[0].place_id,

        q: 'https://maps.googleapis.com/maps/api/geocode/json?address=' + encodeURIComponent(address),
        
        countryName: country? country.long_name: '',

        countryId: country? country.short_name: '',

        toponymName: locality? locality.long_name: '',

        formatted_address : body.results[0].formatted_address,

        lat: body.results[0].geometry.location.lat,
        lng: body.results[0].geometry.location.lng,

        ne_lat: body.results[0].geometry.viewport.northeast.lat,
        ne_lng: body.results[0].geometry.viewport.northeast.lng,
        sw_lat: body.results[0].geometry.viewport.southwest.lat,
        sw_lng: body.results[0].geometry.viewport.southwest.lng,
      }, function(err, nodes) {
        if(err) {
          next(err);
          return;
        };
        //console.log('COCOCOC', nodes)
        next(null, nodes);
        //batch.relate(n, 'helds_in', nodes[0], {upvote: 1, downvote:0});
        //nextReconciliation(null, n, v);
      });
    }); // end of get geocode
  },

  /**
    Create a relationship @relationship from two nodes resource and entity.
    The Neo4J MERGE result will be returned as arg for the next function next(null, result)
    @resource - Neo4J node:resource as js object
    @entity   - Neo4J node:entity as js object
    @next     - your callback with(err, res)
  */
  enrichResource: function(resource, entity, next) {
    neo4j.query(reconcile.merge_relationship_entity_resource, {
      entity_id: entity.id,
      resource_id: resource.id,
      }, function (err, relationships) {
        if(err) {
          next(err)
          return
        }
        next(null, relationships);
    });
  },

  /**
    Dummy Time transformation with moment.
  */
  reconcileHumanDate: function(humanDate, lang, next) {
    var date = humanDate.match(/(\d*)[\sert\-]*(\d*)\s*([^\s]*)\s?(\d{4})/),
        start_date,
        end_date,
        result = {};

    moment.locale(lang);
    var monthName = moment().month(0).format('MMMM');
    
    if(!date) {
      // check other patterns
      var candidate = humanDate.match(/(\d{2,4})?[^\d](\d{2,4})/);
      if(!candidate) {
        next(IS_EMPTY);
        return;
      }
      if(candidate[1].length && candidate[2].length) {
        start_date = moment.utc([1, monthName, candidate[1].length < 4? '19' + candidate[1]:candidate[1]].join(' '), 'LL');
        end_date = moment.utc([1, monthName, candidate[2].length < 4? '19' + candidate[2]:candidate[2]].join(' '), 'LL');
        end_date = moment(end_date).add(1, 'year').subtract(1, 'minutes');
      } else {
        start_date = moment.utc([1, monthName, candidate[2].length < 4? '19' + candidate[2]:candidate[2]].join(' '), 'LL');
        end_date = moment(start_date).add(1, 'year').subtract(1, 'minutes');
      }

      
    } else {
      if(!date[1].length && date[3].length && ['années'].indexOf(date[3].toLowerCase()) !== -1) {
        start_date = moment.utc([1, monthName, date[4]].join(' '), 'LL');
        end_date   = moment(start_date).add(10, 'year').subtract(1, 'minutes');
      } else if(!date[1].length && (!date[3].length || ['vers'].indexOf(date[3].toLowerCase()) !== -1) ) {
        start_date = moment.utc([1, monthName, date[4]].join(' '), 'LL');
        end_date   = moment(start_date).add(1, 'year').subtract(1, 'minutes');
      } else if(!date[1].length) {
        start_date = moment.utc([1,date[3], date[4]].join(' '), 'LL');
        end_date   = moment(start_date).add(1, 'month').subtract(1, 'minutes');
      } else {
        start_date = moment.utc([date[1],date[3], date[4]].join(' '), 'LL');
        if(date[2].length)
          end_date = moment.utc([date[2],date[3], date[4]].join(' '), 'LL')
            .add(24, 'hours')
            .subtract(1, 'minutes');
        else
          end_date = moment(start_date)
            .add(24, 'hours')
            .subtract(1, 'minutes');
      }
    }
    result.start_date = start_date.format();
    result.start_time = +start_date.format('X');
    result.end_date = end_date.format();
    result.end_time = +end_date.format('X');

    next(null, result);
  }
}
      