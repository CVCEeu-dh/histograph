/*
  Available external Services.
  Separation of concern: cfr helpers to transform these services in useful methods...
  
  IN-->OUT
  options, next --> [] array of stuff
  
  test
  mocha -g services
*/
var async    = require('async'),
    fs       = require('fs'),
    path     = require('path'),
    
    clc      = require('cli-color'),
    settings = require('./settings'),
    request  = require('request'),
    
    _        = require('lodash');
    
    
// 
module.exports = {
  dbpedia: function(options, next) {
    if(!settings.dbpedia || !settings.dbpedia.endpoint) {
      next('settings.dbpedia.endpoint not found')
      return;
    };
    
    var url   = settings.dbpedia.endpoint + options.link + '.json',
        followRedirection = options.followRedirection != undefined? options.followRedirection: true,
        level = options.level || 0;// recursion level, see below
    console.log(clc.blackBright('  dbpedia service:'), url);
    request
      .get({
        url: url,//url,
        json: true,
        headers: {
          'Accept':  'application/json'
        },
      }, function (err, res, body) {
        if(err) {
          next(err);
          return;
        }
        
        var redirect = _.first(_.flattenDeep(_.compact(_.pluck(body, 'http://dbpedia.org/ontology/wikiPageRedirects'))));
        
        if(followRedirection && redirect && redirect.value && level < 1) {
          var link = redirect.value.split('/').pop();
          if(options.link == link) {
            // no need to scrape again...
            next(null, body);
            return
          }
          console.log(clc.blackBright('following redirection, level'), clc.cyan(level), clc.blackBright('link'), clc.cyan(link))
          setTimeout(function(){
            module.exports.dbpedia({
              link: link,
              level: level + 1
            }, next);
          }, 2300);
          return;
        };
        
        next(null, body)
      })
  },
  
  /*
    dbpedia lookup PrefixSearch service
    @param options.query
  */
  lookup: function(options, next) {
    if(!settings.dbpedia || !settings.dbpedia.lookup || !settings.dbpedia.lookup.endpoint) {
      next('settings.dbpedia.lookup.endpoint not found')
      return;
    };
    var options = _.assign({
      query: '',
      class: 'person', // e.g. person
      limit: 1
    }, options);
    
    if(options.query.match(/[^a-zA-Z_\-'%0-9,\.]/g)) {
      options.query = encodeURIComponent(options.query);
    }

    request.get({
      url: settings.dbpedia.lookup.endpoint,
      qs: {
        QueryString: options.query,
        MaxHits: options.limit,
        QueryClass: options.class,
      },
      json: true,
      headers: {
        'Accept':  'application/json'
      }
    }, function (err, res, body) {
      if(err) {
        next(err);
        return;
      }
      
      next(null, body)
    });
  
  },
  /*
    Textrazor entities extraction service from a given text.
    usage:
    require(services)
    services.textrazor({text: '...'}, function (err, entities) {
      ...
      {
            entityId: ,
            startingPos: ,
            endingPos: ,
            matchedText: ,
            type: ,
            wikiLink: }
    })      
    @param options - MUST contain text
    
  */
  textrazor: function(options, next) {
    if(!settings.textrazor || !settings.textrazor.endpoint) {
      next('settings.textrazor.endpoint not found')
      return;
    };
    if(!options.text) {
      next('textrazor text suould be a long text')
      return;
    };
    var form = _.merge({
          apiKey: settings.textrazor.key,
          extractors: settings.textrazor.extractors? settings.textrazor.extractors.join(','): 'entities'
        }, options);
    request
      .post({
        url: settings.textrazor.endpoint,
        json: true,
        form: form
      }, function (err, res, body) {
        if(err) {
          console.log('ERROR.',err)
          next(err);
          return;
        }
        if(body.error) { // lanugage etc... just ignore, but print it
          console.log('IGNORE ERROR', body)
          next(null, []);
          return
        }
        if(!body.response) {
          console.log(body)
          next(body.error);
          return
        }
        
        console.log(form, 'body', _.keys(body.response));
        if(settings.textrazor.extractors)
          next(null, _.flatten(settings.textrazor.extractors.map(function (d) {
            return body.response[d] || [];
          })));
        else
          next(null, body.response.entities || []);
      })
  },
  /*
    VIAF reconciliation service.
    @param options.link
  */
  viaf: {
    reconcile: function(options, next) {
      if(!settings.dbpedia || !settings.dbpedia.endpoint) {
        next('settings.dbpedia.endpoint not found')
        return;
      };
      if(isNaN(options.link)) {
        next('viaf link should be a numeric identifier')
        return;
      };
      
      var url = settings.viaf.endpoint + options.link + '/' + settings.viaf.format;
      console.log(clc.blackBright('viaf service'), url);
      request
        .get({
          url: url
        }, function (err, res, body) {
          if(err) {
            console.log(clc.red('error'), err);
            next(err);
            return;
          }
          //console.log(body)
          next(null, body);
        });
    },

    autosuggest: function(options, next) {
      if(!settings.viaf) {
        next('settings.viaf not found')
        return;
      }

      request
        .get({
          url: settings.viaf.autosuggest.endpoint,//url,
          json: true,
          qs: {
            query: options.query
          },
          headers: {
            'Accept':  'application/json'
          }
        }, function (err, res, body) {
          if(err) {
            next(err);
            return;
          }
          next(null, body)
        });
    },
    links: function(options, next) {
      if(!settings.viaf) {
        next('settings.viaf not found')
        return;
      };
      
      var url =  settings.viaf.links.endpoint + options.link + '/justlinks.json';
      console.log(clc.blackBright('   viaf links:'), url);

      request
        .get({
          url: url,//url,
          json: true,
          headers: {
            'Accept':  'application/json'
          }
        }, function (err, res, body) {
          if(err) {
            next(err);
            return;
          }
          next(null, body)
        });
    }
  },
  


  yagoaida: function(options, next) {
    if(!settings.yagoaida || !settings.yagoaida.endpoint) {
      next('settings.yagoaida.endopoint not found')
      return;
    }
    // console.log('AIDA', options)
    request
      .post({
        url: settings.yagoaida.endpoint,
        json: true,
        headers: {
          'Accept': '*/*'
        },
        form: {
          text: options.text
        }
      }, function (err, res, body) {
        if(err) {
          next(err);
          return;
        }
        // FLATTEN YAGO entities by providing only entitites having "best entity"
        if(!body.mentions) {
          console.log(body);
          next(null, []);
          return;
        }
        
        var entities = body.mentions.filter(function (d) {
          return d.bestEntity && d.bestEntity.kbIdentifier;
        }).map(function (d) {
          var _d = _.merge({
            startingPos: d.offset,
            endingPos: d.offset + d.length,
            matchedText: d.name
          }, body.entityMetadata[d.bestEntity.kbIdentifier]);
          
          if(_d.url)
            _d.wikiLink = path.basename(_d.url);
          // console.log(body.entityMetadata[d.bestEntity.kbIdentifier])
          return _d;
        });
        next(null, entities);
      });
  },

  wikidata: {
    entity: function(options, next) {
      if(!settings.wikidata) {
        next('settings.wikidata not found')
        return;
      };
      
      var url =  settings.wikidata.entity.endpoint + options.link + '.json';
      console.log(clc.blackBright('   wikidata links:'), url);

      request
        .get({
          url: url,//url,
          json: true,
          headers: {
            'Accept':  'application/json'
          }
        }, function (err, res, body) {
          if(err)
            next(err);
          else if(_.isEmpty(body.entities))
            next('IS_EMPTY');
          else if(body.entities[options.link])
            next(null, body.entities[options.link])
          else
            next(null, _.first(_.values(body.entities)))
        });
    }
  },
  /*
    Geonames as family of services.
    Todo: services refactory required
  */
  _geonames: {
    findNearestAddress: function(options, next) {
      
      
    }
  },
  geonames: function(options, next) {
    if(!settings.geonames ||_.isEmpty(settings.geonames.username)) {
      next(null, []);
      return;
    }
    var qs = _.assign({
        lang: 'en',
        isNameRequired: true,
        maxRows: 5,
        style: 'long',
        username: settings.geonames.username
      }, options, {
        q: options.address
      });
    
    request.get({
      url: settings.geonames.endpoint,
      json: true,
      qs: qs
    }, function (err, res, body) {
      if(err) {
        next(err);
        return;
      }
      
      if(!body.geonames || !body.geonames.length) {
        if(body.status) {
          console.log(body.status)
        }
        next(null, []);
        return;
      };
      
      var name = _.unique([body.geonames[0].toponymName, body.geonames[0].countryName]).join(', ');
      // console.log(name, '----->', body.geonames[0]);
      
      next(null, _.take(body.geonames.map(function (result) {
        var name;
        
        if(result.fcl == 'A') // that is, the country
          name = result.toponymName;
        else
          name = result.toponymName;
        
        return _.assign(result, {
          _id:      result.geonameId,
          _name:    name,
          _country: result.countryCode,
          _query:   options.address
        })
      }), 2));
    })
  },
  /*
    Call the reverse geocoding api according to your current settings.
    Please make sure you use the proper `settings.geocoding.key`.
    A successful request should return an array of entity candidates.
    
    @param options  - dict of options, options.latlng should exist in the format `lat,lng` e.g `latlng:"40.714224,-73.961452"`;
    @param next     - your callback(err, res). 
  */
  reverse_geocoding: function(options, next) {
    if(!settings.geocoding ||_.isEmpty(settings.geocoding.key)) {
      next(null, []);
      return;
    }
    request.get({
      url: settings.geocoding.endpoint,
      qs: _.assign({
        key: settings.geocoding.key
      }, options, {
        q: options.address
      }),
      json: true
    }, function (err, res, body) {
      if(err) {
        console.log('service geocoding failed')
        next(err);
        return;
      }
      
      // console.log(url)
      if(!body.results.length) {
        if(body.error_message) {
          console.log('service geocoding failed')
          next(body.error_message)
          return;
        } 
        next(null, []);
        return;
      };
      // adding name, fcl and country code as well: it depends on the level.
      next(null, _.take(_.filter(body.results.map(function (result) {
        var name = result.formatted_address,
            fcl  = 'L', 
            country;
        // console.log(result.address_components)
        
        // down to locality
        // name = _.get(_.find(result.address_components, function (d){
        //   return d.types.indexOf('locality') != -1
        // }), 'long_name'); 
        name = _.map(result.address_components.filter(function(d) {
          return d.types.indexOf('political') !== -1;
        }),'long_name').join(', ')

        country = _.find(result.address_components, function (d){
          return d.types.indexOf('country') != -1
        });   
        
        if(!country){
          country = result.address_components[0]
        }
        if(!country){
          console.log(result)
          throw 'stop'
        }
        
        return _.assign(result, {
          _id:      result.place_id,
          _name:    name,
          _fcl:     fcl,
          _country: country.short_name,
          _query:   options.latlng,
        });
      }), '_name'), 2));
    })
  },
  /*
    Call the google geocoding api according to your current settings.
    Please make sure you use the proper `settings.geocoding.key`.
    A successful request should return an array of entity candidates.
    
    @param options  - dict of options, options.address should exist;
    @param next     - your callback(err, res). 
  */
  geocoding: function(options, next) {
    if(!settings.geocoding ||_.isEmpty(settings.geocoding.key)) {
      next(null, []);
      return;
    }
    request.get({
      url: settings.geocoding.endpoint,
      qs: _.assign({
        key: settings.geocoding.key
      }, options, {
        q: options.address
      }),
      json: true
    }, function (err, res, body) {
      if(err) {
        console.log('service geocoding failed')
        next(err);
        return;
      }
      
      // console.log(url)
      if(!body.results.length) {
        if(body.error_message) {
          console.log('service geocoding failed')
          next(body.error_message)
          return;
        } 
        next(null, []);
        return;
      };
      // adding name, fcl and country code as well: it depends on the level.
      next(null, _.take(body.results.map(function (result) {
        var name = result.formatted_address,
            fcl, 
            country;
        
        if(result.types.indexOf('continent') != -1) { 
          fcl = 'L';
        } else if(result.types.indexOf('country') != -1) {
          fcl = 'A';
        } else if(result.types.indexOf('locality') != -1) {
          fcl = 'P';
        } else {
          // console.log(result, options.address)
          // throw 'stop'
        }
        country = _.find(result.address_components, function (d){
          return d.types.indexOf('country') != -1
        });   
        
        if(!country){
          country = result.address_components[0]
        }
        if(!country){
          console.log(result)
          throw 'stop'
        }
        
        return _.assign(result, {
          _id:      result.place_id,
          _name:    name,
          _fcl:     fcl,
          _country: country.short_name,
          _query:   options.address,
        });
      }), 2));
      
      // if()
      
      // console.log(body.results[0].formatted_address, 'for', options.address);
      // console.log(body.results[0].address_components)

      // var country = _.find(body.results[0].address_components, function (d){
      //     return d.types[0] == 'country';
      //   }),
      //   locality =  _.find(body.results[0].address_components, function (d){
      //     return d.types[0] == 'locality';
      //   });
      // // the entity name
      // var name_partials = [];
      // if(locality && locality.long_name)
      //   name_partials.push(locality.long_name);
      // if(country && country.long_name)
      //   name_partials.push(country.long_name);
      // var name = name_partials.length? name_partials.join(', '): body.results[0].formatted_address;
      // console.log(body.results[0], name)
    })
  }
};