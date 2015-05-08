/**
  A bunch of useful functions
*/
var fs       = require('fs'),
    path     = require('path'),
    async    = require('async'),
    crypto   = require('crypto'),
    settings = require('./settings'),
    services = require('./services'),
    request  = require('request'),
    _        = require('lodash'),
    moment   = require('moment'),
    xml      = require('xml2js'),

    IS_EMPTY = 'is_empty',
    LIMIT_REACHED = 'LIMIT_REACHED', // when limit of request for free /pauid webservices has been reached.
    IS_IOERROR  = 'IOError',

    reconcile  = require('decypher')('./queries/migration.resolve.cyp'),
    neo4j      = require('seraph')(settings.neo4j.host);

module.exports = {
  IS_EMPTY: IS_EMPTY,
  IS_IOERROR: IS_IOERROR,
  IS_LIMIT_REACHED: LIMIT_REACHED,
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
    Handle causes and stacktraces provided by seraph Query and rawQuery.
    @err the err OBJECT provided by cypher
    @res the express response object
  */
  cypherQueryError: function(err, res) {
    // for(i in err)
    //   console.log(i)
    // console.log('@helpers.cypherQueryError', err.neo4jException, err.statusCode, err.neo4jCause)
    switch(err.neo4jException) {
      case 'EntityNotFoundException':
        return res.error(404, {
          message:  err.neo4jCause.message,
          exception: err.neo4jException
        });
      default:
        return res.error(err.statusCode, err);
    };
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
    Call dbpedia service and translate its xml to a more human json content
    @to be tested, ideed
  */
  dbpedia: function(fullname, next) {
    request.get('http://lookup.dbpedia.org/api/search.asmx/PrefixSearch?QueryClass=person&MaxHits=5&QueryString='
      + encodeURIComponent(fullname),
      function (err, res, body) {
        if(err) {
          next(err);
          return;
        }

        xml.parseString(body, function(err, result) {
          if(err) {
            next(err); // this should never happen /D
            return;
          }

          if(!result || !result.ArrayOfResult || !result.ArrayOfResult.Result) {
            next(IS_EMPTY);
            return;
          }
          next(null, result.ArrayOfResult.Result);
        });
      }
    );
  },
  /*
    Transform a wiki object to a valid entity:person data
    
  */
  dbpediaPerson: function(link, next) {
    services.dbpedia({
      link: link
    }, function(err, wiki){
      if(err) {
        next(err);
        return;
      };
      if(_.size(wiki) == 0) {
        next(IS_EMPTY);
        return;
      };
      var languages = [],
          props = {
            thumbnail:   'http://dbpedia.org/ontology/thumbnail',
            birth_date:  'http://dbpedia.org/property/dateOfBirth',
            death_date:  'http://dbpedia.org/property/dateOfDeath',
            birth_place: 'http://dbpedia.org/property/placeOfBirth',
            death_place: 'http://dbpedia.org/property/placeOfDeath',
            description: 'http://dbpedia.org/property/shortDescription',
            abstracts:   'http://dbpedia.org/ontology/abstract'
          };
      // find fields and complete the properties dict
      _.forIn(props, function (v, k, o) {
        o[k] = _.flattenDeep(_.compact(_.pluck(wiki, v)))
        if(k != 'abstracts')
          o[k] =_.first(o[k]);
      });
      // find  abstracts for specific languages
      _.filter(props.abstracts, function(d) {
        if(d.lang && settings.languages.indexOf(d.lang) !== -1) {
          props['abstract_' + d.lang] = d;
          languages.push(d.lang);
        }
      })
      // delete the big useless abstracts
      delete props.abstracts;
     
      // extract the juice and clean undefined
      _.forIn(props, function (v, k, o) {
        if(o[k] === undefined) {
          delete o[k];
        } else if(o[k].datatype == 'http://www.w3.org/2001/XMLSchema#date') {
          var _k = k.split('_').shift(),
              _date = module.exports.reconcileDate(v.value, 'YYYY-MM-DD'); // new k
          delete o[k];
          for(var i in _date){
            o[_k + '_' + i] = _date[i]
          }
        } else {
          o[k] = v.value;
        }
      });
      //console.log(props)
      // abstract languages
      props.languages = _.unique(languages); 
      next(null, props);
    });
  },
  /*
    Transform a wiki object to a valid entity:person data
  */
  lookupPerson: function(query, next) {
    services.lookup({
      query: query,
      class: 'person'
    }, function (err, wiki) {
      if(err) {
        next(err);
        return;
      };
      if(wiki.results.length == 0) {
        next(IS_EMPTY);
        return;
      };
      var props = {};
      
      if(wiki.results[0].label)
        props.name = wiki.results[0].label;
      
      if(wiki.results[0].description)
        props.description = wiki.results[0].description
      
      if(wiki.results[0].uri)
        props.links_wiki = wiki.results[0].uri.split('/').pop();
      
      next(null, props);
    });
  },
  /*
    Transform a viaf object to valid entity:person data
  */
  viafPerson: function(link, next) {
    services.viaf({
      link: link
    }, function (err, content) {
      if(err) {
        next(err);
        return;
      };
      xml.parseString(content, {explicitArray: true}, function(err, res) {
        if(err) {
          next(err);
          return;
        };
        // get birthdate / deathdate and nationalities..
        next(null, {})
      })
      
    })
  },
  /**
    Call textrazor service for people/place reconciliation.
    When daily limit has been reached, the IS_EMPTY error message will be given to next()
    If there are no entities, res will contain an empty array but no error will be thrown.
    @return err, res
   */
  textrazor: function (text, next) {
    request
      .post({
        url: settings.textrazor.endpoint,
        json: true,
        form: {
          text: text,
          apiKey: settings.textrazor.key,
          extractors: 'entities'
        }
      }, function (err, res, body) {
        console.log('TEXTRAZOR', err)
        // console.log(body.response.entities.length);

        if(body.error) { // probably limit reached. 
          next(LIMIT_REACHED);
          return;
        }

        var entities = [];
        var persons =  _.filter(body.response.entities, {type: ['Person']});
        var locations =  _.filter(body.response.entities, {type: ['Place']});

        console.log(_.map(persons, 'entityId'), _.map(locations, 'entityId'));


        var queue = async.waterfall([
          // person reconciliation (merge by)
          function (nextReconciliation) {
            var q = async.queue(function (person, nextPerson) {
              if(person.wikiLink) {
                neo4j.query(reconcile.merge_person_entity_by_links_wiki, {
                  name: person.entityId,
                  links_wiki: path.basename(person.wikiLink),
                  links_yago: '',
                  service: 'textrazor'
                }, function (err, nodes) {
                  if(err)
                    throw err;
                  // enrich with context
                  nodes = nodes.map(function(d) {
                    d.context = {
                      left: person.startingPos,
                      right: person.endingPos
                    };
                    return d;
                  });

                  entities = entities.concat(nodes);
                  nextPerson();
                })
              } else {
                neo4j.query(reconcile.merge_person_entity_by_name, {
                  name: person.entityId,
                  service: 'textrazor'
                }, function (err, nodes) {
                  if(err)
                    throw err;
                  
                  nodes = nodes.map(function(d) {
                    d.context = {
                      left: person.startingPos,
                      right: person.endingPos
                    };
                    return d;
                  });

                  entities = entities.concat(nodes);
                  nextPerson();
                })
              };   
            }, 1);

            q.push(persons);
            q.drain = nextReconciliation
          },
          // geonames/geocode reconciliation via 
          // places entity (locations and cities) by using geonames services
          function (nextReconciliation) {
            var q = async.queue(function (location, nextLocation) {
              module.exports.geonames(location.entityId, function (err, nodes){
                if(err == IS_EMPTY) {
                  nextLocation();
                  return;
                } else if(err)
                  throw err;
                nodes = nodes.map(function(d) {
                  d.context = {
                    left: location.startingPos,
                    right: location.endingPos
                  };
                  return d;
                });
                   // adding LOCAL lazy context here, provided by textrazor
                entities = entities.concat(nodes);
                nextLocation();
              })
            }, 1);
            q.push(locations);
            q.drain = nextReconciliation;
          },
          // places entities (countries and cities) by using geocoding services
          function (nextReconciliation) {
            var q = async.queue(function (location, nextLocation) {
              module.exports.geocoding(location.entityId, function (err, nodes){
                if(err == IS_EMPTY) {
                  nextLocation();
                  return;
                } else if(err)
                  throw err
                nodes = nodes.map(function(d) {
                  d.context = {
                    left: location.startingPos,
                    right: location.endingPos
                  };
                  return d;
                });
                entities = entities.concat(nodes);
                nextLocation();
              })
            }, 1);
            q.push(locations);
            q.drain = nextReconciliation;
          }

        ], function() {
          next(null, entities);
        });
      });
  },
  /**
    Call alchemyapi service for people/places reconciliation.
    Whenever possible, reconciliate with existing entitites in neo4j db.
   */
  alchemyapi: function(text, service, next) {
    if(settings.alchemyapi.services.indexOf(service) == -1){
      next(IS_IOERROR);
      return
    };
    console.log('  ', service, text);
    
    request
      .post({
        url: settings.alchemyapi.endpoint.text + service,
        json: true,
        form: {
          text: text,
          apikey: settings.alchemyapi.key,
          outputMode: 'json',
          knowledgeGraph: 1
        }
      }, function (err, res, body) {
        console.log(body.status, body.statusInfo);
        if(body.status == 'ERROR' && body.statusInfo == "unsupported-text-language") {
          next(null, []); // unsupported latnguage should be a warning, not an error
          return;
        }

        if(body.status == 'ERROR') {
          next(IS_EMPTY);
          return;
        } 
        console.log(body.entities)
        // get persons
        // console.log('all persons ', _.filter(body.entities, {type: 'Person'}));

        var persons =  _.filter(body.entities, {type: 'Person'}),
            locations =  body.entities.filter(function (d){
              return d.disambiguated && (d.type == 'Country' || d.type == 'City')
            }),
            entities = [],
            queue;
        console.log(_.map(locations, function(d){return d.text}))
        var queue = async.waterfall([
          // person reconciliation (merge by)
          function (nextReconciliation) {
            var q = async.queue(function (person, nextPerson) {
              if(person.disambiguated && (person.disambiguated.dbpedia || person.disambiguated.yago)) {
                neo4j.query(reconcile.merge_person_entity_by_links_wiki, {
                  name: person.disambiguated.name,
                  links_wiki: path.basename(person.disambiguated.dbpedia) || '',
                  links_yago: path.basename(person.disambiguated.yago) || '',
                  service: 'alchamyapi'
                }, function (err, nodes) {
                  if(err)
                    throw err;
                  entities = entities.concat(nodes);
                  nextPerson();
                })
              } else {
                neo4j.query(reconcile.merge_person_entity_by_name, {
                  name: person.disambiguated? person.disambiguated.name : person.text,
                  service: 'alchemyapi'
                }, function (err, nodes) {
                  if(err)
                    throw err;
                  entities = entities.concat(nodes);
                  nextPerson();
                })
              };   
            }, 1);

            q.push(persons);
            q.drain = nextReconciliation
          },
          // places entity (locations and cities) by using geonames services
          function (nextReconciliation) {
            var q = async.queue(function (location, nextLocation) {
              module.exports.geonames(location.disambiguated.name, function (err, nodes){
                if(err == IS_EMPTY) {
                  nextLocation();
                  return;
                } else if(err)
                  throw err
                entities = entities.concat(nodes);
                nextLocation();
              })
            }, 1);
            q.push(locations);
            q.drain = nextReconciliation;
          },
          // places entities (countries and cities) by using geocoding services
          function (nextReconciliation) {
            var q = async.queue(function (location, nextLocation) {
              module.exports.geocoding(location.disambiguated.name, function (err, nodes){
                if(err == IS_EMPTY) {
                  nextLocation();
                  return;
                } else if(err)
                  throw err
                entities = entities.concat(nodes);
                nextLocation();
              })
            }, 1);
            q.push(locations);
            q.drain = nextReconciliation;
          }
          // geonames/geocode reconciliation via 
        ], function() {
          next(null, entities);
        });
      }); // end request.post for alchemyapi service
    
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
      resource_id: resource.id
      }, function (err, relationships) {
        if(err) {
          next(err)
          return
        }
        next(null, relationships);
    });
  },

  /*
    Return this moment ISO timestamp and this moment EPOCH ms timestamp
  */
  now: function() {
    var now = moment.utc(),
        result = {};
    
    result.date = now.format();
    result.time = +now.format('X');
    return result;
  },
  
  /*
    Transform a date in the current db format and return a dict of date and time
    @date   - string e.g "1921-11-27"
    @format - the parser e.g "MM-DD-YYYY"
    @next [optional] - callback. if it is not provided, send back the result.
  */
  reconcileDate: function(date, format, next) {
    var d = moment.utc(date, format),
        result = {
          date: d.format(),
          time: d.format('X')
        };
    if(next)
      next(null, result);
    else
      return result;
  },
  
  /**
    Dummy Time transformation with moment.
  */
  reconcileHumanDate: function(humanDate, lang, next) {
    var date = humanDate.match(/(\d*)[\sert\-]*(\d*)\s*([^\s\(\)]*)\s?(\d{4})/),
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
      
      if(candidate[1] && candidate[2]) {
        start_date = moment.utc([1, monthName, candidate[1].length < 4? '19' + candidate[1]:candidate[1]].join(' '), 'D MMMM YYYY').set('hour', 0);
        end_date = moment.utc([1, monthName, candidate[2].length < 4? '19' + candidate[2]:candidate[2]].join(' '), 'D MMMM YYYY');
        end_date = moment(end_date).add(1, 'year').subtract(1, 'minutes');
      } else {
        start_date = moment.utc([1, monthName, candidate[2].length < 4? '19' + candidate[2]:candidate[2]].join(' '), 'D MMMM YYYY').set('hour', 0);
        end_date = moment(start_date).add(1, 'year').subtract(1, 'minutes');
      }
      result.text_date = candidate[0]
      
    } else {
      if(!date[1].length && date[3].length && ['années'].indexOf(date[3].toLowerCase()) !== -1) {
        start_date = moment.utc([1, monthName, date[4]].join(' '), 'D MMMM YYYY').set('hour', 0);
        end_date   = moment(start_date).add(10, 'year').subtract(1, 'minutes');
      } else if(!date[1].length && (!date[3].length || ['vers'].indexOf(date[3].toLowerCase()) !== -1) ) {
        start_date = moment.utc([1, monthName, date[4]].join(' '), 'D MMMM YYYY').set('hour', 0);
        end_date   = moment(start_date).add(1, 'year').subtract(1, 'minutes');
      } else if(!date[1].length && date[2].length && date[3].length && date[4].length) {
        start_date = moment.utc([date[2],date[3], date[4]].join(' '), 'D MMMM YYYY').set('hour', 0);
        end_date = moment(start_date)
            .add(24, 'hours')
            .subtract(1, 'minutes');
      } else if(!date[1].length) {
        //console.log(date, [1,date[3], date[4]].join(' '), moment.utc([1,date[3], date[4]].join(' '), 'D MMMM YYYY'))
        start_date = moment.utc([1,date[3], date[4]].join(' '), 'D MMMM YYYY').set('hour', 0);
        end_date   = moment(start_date).add(1, 'month').subtract(1, 'minutes');
      } else {
        start_date = moment.utc([date[1],date[3], date[4]].join(' '), 'D MMMM YYYY').set('hour', 0);
        if(date[2].length)
          end_date = moment.utc([date[2],date[3], date[4]].join(' '), 'D MMMM YYYY')
            .add(24, 'hours')
            .subtract(1, 'minutes');
        else
          end_date = moment(start_date)
            .add(24, 'hours')
            .subtract(1, 'minutes');
      }
      result.text_date = date[0]
    }
    result.start_date = start_date.format();
    result.start_time = +start_date.format('X');
    result.end_date = end_date.format();
    result.end_time = +end_date.format('X');

    next(null, result);
  },

  /**
    AlchemyApi connections
  */
  /**
    Send a picture to the rekognition service
  */
  rekognition: function(filepath, next) {
    fs.readFile(filepath, function (err, img) {
      if(err) {
        next(IS_IOERROR)
        return;
      }
      //console.log('image', filepath)
      var encoded_image = img.toString('base64');
      request
        .post({
          url: 'http://rekognition.com/func/api/',
          json: true,
          form: { 
            api_key: settings.rekognition.API_KEY,
            api_secret: settings.rekognition.API_SECRET,
            jobs: 'face_part_detail_recognize_emotion_beauty_gender_emotion_race_eye_smile_mouth_age_aggressive',
            base64: encoded_image,
            name_space: settings.rekognition.NAME_SPACE,
            user_id: settings.rekognition.USER_ID
          }
        }, function (err, res){
          if(err) {
            next(err)
            return;
          }
          next(null, res.body)
        });
    }); // eof readFile
  },

  /**
    Send a picture to the skybiometry face detection service
  */
  skybiometry: function(filepath, next) {
    var form = { 
          api_key:  settings.skybiometry.API_KEY,
          api_secret:  settings.skybiometry.API_SECRET,
          attributes: 'all',
          detect_all_feature_points:  'true',
          files: fs.createReadStream(filepath)
        };

    var req = request
      .post({
        url: 'http://api.skybiometry.com/fc/faces/detect',
        json: true,
        formData: form
      }, function (err, res, req){
        if(err) {
          next(err)
          return;
        }
        next(null, res.body)
      });
    //console.log(req)
  },

  /**
    Send a picture to animetrics.com face detection service.
    remap the results to the common "face" tamplating for version
  */
  animetrics: function(filepath, next) {
    var form = { 
          api_key:  settings.animetrics.API_KEY,
          selector:  'FULL',
          image: fs.createReadStream(filepath)
        };

    var req = request
      .post({
        url: settings.animetrics.endpoint.detect,
        json: true,
        formData: form
      }, function (err, res, req){
        if(err) {
          next(err)
          return;
        }
        if(res.body.errors) {
          next(res.body.errors)
          return;
        }
        console.log(res.body)
        if(!res.body.images || !res.body.images.length || !res.body.images[0].faces.length) {
          next(IS_EMPTY);
          return;
        };
        // remap!
        var image = res.body.images[0];

        image.faces = image.faces.map(function (d) {
          /** original face information
          { 
            topLeftX: 127,
            topLeftY: 78,
            width: 132,
            height: 132,
            leftEyeCenterX: 166.05,
            leftEyeCenterY: 130.25,
            rightEyeCenterX: 208.95,
            rightEyeCenterY: 129.7,
            noseTipX: 188.39376294388,
            noseTipY: 156.96469773918,
            noseBtwEyesX: 189.20319427534,
            noseBtwEyesY: 123.70034364528,
            chinTipX: 193.84846382534,
            chinTipY: 216.86817213518,
            leftEyeCornerLeftX: 159.35546875,
            leftEyeCornerLeftY: 131.00625,
            leftEyeCornerRightX: 176.78359375,
            leftEyeCornerRightY: 130.7828125,
            rightEyeCornerLeftX: 198.9125,
            rightEyeCornerLeftY: 131.16953125,
            rightEyeCornerRightX: 215.66171875,
            rightEyeCornerRightY: 130.284375,
            rightEarTragusX: 227.25349991883,
            rightEarTragusY: 139.43476047441,
            leftEarTragusX: -1,
            leftEarTragusY: -1,
            leftEyeBrowLeftX: 151.39518911442,
            leftEyeBrowLeftY: 124.26248076483,
            leftEyeBrowMiddleX: 165.65862043483,
            leftEyeBrowMiddleY: 118.83435907659,
            leftEyeBrowRightX: 179.35741777102,
            leftEyeBrowRightY: 119.28268882919,
            rightEyeBrowLeftX: 200.22669884463,
            rightEyeBrowLeftY: 119.62440636946,
            rightEyeBrowMiddleX: 211.94083364907,
            rightEyeBrowMiddleY: 118.14622570612,
            rightEyeBrowRightX: 223.75188864653,
            rightEyeBrowRightY: 123.18666662225,
            nostrilLeftHoleBottomX: 181.30081536088,
            nostrilLeftHoleBottomY: 162.28620721508,
            nostrilRightHoleBottomX: 196.94550715161,
            nostrilRightHoleBottomY: 162.05359875182,
            nostrilLeftSideX: 174.71434964629,
            nostrilLeftSideY: 157.82009230248,
            nostrilRightSideX: 201.45039014142,
            nostrilRightSideY: 158.07458166902,
            lipCornerLeftX: -1,
            lipCornerLeftY: -1,
            lipLineMiddleX: -1,
            lipLineMiddleY: -1,
            lipCornerRightX: -1,
            lipCornerRightY: -1,
            pitch: -0.69633820470046,
            yaw: -12.586200046938,
            roll: -0.90004336228229,
            attributes: { gender: { time: 0.05935, type: 'F', confidence: '80%' } } }
          
          */
          var _d = {
            region: {
              left:   d.topLeftX,
              top:    d.topLeftY,
              right:  d.topLeftX + d.width,
              bottom: d.topLeftY + d.height,
            },
            markers: [],
            pose: {
              pitch: d.pitch,
              yaw: d.yaw,
              roll: d.roll
            },
          };
          if(d.leftEyeCenterX)
            _d.markers.push({
              label: 'LeftEye',
              x: d.leftEyeCenterX,
              y: d.leftEyeCenterY
            });
          if(d.rightEyeCenterX)
            _d.markers.push({
              label: 'RightEye',
              x: d.rightEyeCenterX,
              y: d.rightEyeCenterX
            });
          if(d.noseTipX)
            _d.markers.push({
              label: 'Nose',
              x: d.noseTipX,
              y: d.noseTipY
            });
          if(d.lipCornerLeftX)
            _d.markers.push({
              label: 'MouthLeft',
              x: d.lipCornerLeftX,
              y: d.lipCornerLeftY
            });
          if(d.lipCornerRightX)
            _d.markers.push({
              label: 'MouthRight',
              x: d.lipCornerRightX,
              y: d.lipCornerRightY
            });

          return _d;
        })
        next(null, image)
      });
    //console.log(req)
  },
  
}
      