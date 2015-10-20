/**
  A bunch of useful functions
*/
var fs       = require('fs'),
    path     = require('path'),
    async    = require('async'),
    crypto   = require('crypto'),
    settings = require('./settings'),
    services = require('./services'),
    parser   = require('./parser'),
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
  /*
    Handlers for express response (cfr. models/)
    @param err
    @param res    - express response
    @param items  - array of items to return
    @param params - the validated params describing the result
    
  */
  models:{
    getOne: function (err, res, item, info) {
      if(err == IS_EMPTY)
        return res.error(404);
      if(err)
        return module.exports.cypherQueryError(err, res);
      return res.ok({
        item: item
      }, info || {});
    },
    getMany: function (err, res, items, info, params) {
      if(err && err != IS_EMPTY)
        return module.exports.cypherQueryError(err, res);
      res.ok({
        items: items
      }, _.assign(info || {}, params || {}));
    }
  },
  /**
    Given a query and its cypher params, do wonderful stuff.
    The query MUST resturn a list of (source,target,weight) triads.
    @param query  - cypher query
    @param params - cypher query params
    @return (err, graph) - error, or a graph of nodes and edges
  */
  cypherGraph: function(query, params, next) {
    neo4j.query(query, params, function (err, items) {
      if(err) {
        next(err);
        return;
      }
      
      var graph = {
        nodes: [],
        edges: []
      };
      var index = {};
      
      for(var i = 0; i < items.length; i++) {
        if(!index[items[i].source.id]) {
          index[items[i].source.id] = 1;//items[i].source;
          graph.nodes.push(items[i].source);
        }
        if(!index[items[i].target.id]) {
          index[items[i].target.id] = 1;//items[i].target;
          graph.nodes.push(items[i].target);
        }
        
        var edgeId = _.sortBy([items[i].target.id, items[i].source.id]).join('.');
        
        if(!index[edgeId]) {
          index[edgeId] = 1;
          graph.edges.push({
            id: edgeId,
            source: items[i].source.id,
            target: items[i].target.id,
            weight: items[i].weight
          });
        }
      }
      next(null, graph);
    })
  },
   /**
    Given a query, extract one useful timeline.
    The query MUST return a list of (timestamp,weight) couples.
    @param query  - cypher query
    @param params - cypher and agentBrown query params
    @return (err, graph) - error, or a graph of nodes and edges
  */
  cypherTimeline: function(query, params, next) {
    var query = parser.agentBrown(query, params);
    neo4j.query(query, params, function (err, items) {
      if(err) {
        next(err);
        return;
      }
      next(null, items);
    })
  },
  
  /**
    Handle causes and stacktraces provided by seraph Query and rawQuery.
    @err the err OBJECT provided by cypher
    @res the express response object
  */
  cypherQueryError: function(err, res) {
    switch(err.neo4jException) {
      case 'EntityNotFoundException':
        res.error(404, {
          message:  err.neo4jCause.message,
          exception: err.neo4jException
        });
        break;
      case 'ParameterNotFoundException':
        res.error(404, {
          message:  err.neo4jError.message,
          exception: err.neo4jException
        });
        break;
      default:
        if (err.statusCode) {
          res.error(err.statusCode, err.neo4jError.message.message);
        } else {
          res.error(400, err);
        }
    };
  },
  
  /**
    Handle Form errors (Bad request)
  */
  formError: function(err, res) {
    return res.error(400, err);
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
    Call dbpedia service and translate its xml to a more human json content.
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
            abstracts:   'http://dbpedia.org/ontology/abstract',
            first_name:  'http://xmlns.com/foaf/0.1/givenName',
            last_name:   'http://xmlns.com/foaf/0.1/surname'
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
      if(!wiki.results.length) {
        next(IS_EMPTY);
        return;
      };
      
      var results = [];
      
      for(var i=0; i < wiki.results.length; i++) {
        var props = {};
        
        if(wiki.results[i].label)
          props.name = wiki.results[i].label;
        
        if(wiki.results[i].description)
          props.description = wiki.results[i].description
        
        if(wiki.results[i].uri)
          props.links_wiki = wiki.results[i].uri.split('/').pop();
        
        results.push(props)
      }

      next(null, results);
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
      xml.parseString(content, {explicitArray: true}, function (err, res) {
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
  textrazor: function (options, next) {
    services.textrazor(_.assign({
      cleanup_use_metadata: true
    }, options), function (err, entities) {
      if(err)
        return next(err);
      
      var entitiesPrefixesToKeep = {
            PopulatedPlace: 'location',
            Person: 'person',
            Organisation: 'organization',
          };
          
      // clean entities
      entities = entities.map(function (d) {
        var _d = {
          name: d.entityEnglishId || d.entityId,
          links_wiki: module.exports.text.wikify(d.wikiLink),
          service: 'textrazor'
        };
        
        _d.context = {
          left: d.startingPos,
          right: d.endingPos,
          matched_text: d.matchedText
        };
        
        if(d.type && d.type.length){
          _d.__type = _.unique(d.type);
          _d.type = _.unique(_.compact(d.type.map(function (type) {
            return entitiesPrefixesToKeep[type]
          })));
          
        }
        else
          _d.type = [];
        return _d;
      });
      next(null, entities)
    });
  },
  /**
    A listo fo useful text filters
  */
  text: {
    /*
      Return the current language for the text provided, if available
    */
    language: function(text, defaultLanguage) {
      var Langdetect = require('languagedetect'),
          langdetect = new Langdetect('iso2'),
          languages = langdetect.detect(text);
      return languages.length? _.first(_.first(languages)) : (defaultLanguage || 'en');
    },
    
    translit: function (text) {
      var from = 'àáäâèéëêìíïîòóöôùúüûñç',
          to   = 'aaaaeeeeiiiioooouuuunc';
      for (var i=0, l=from.length ; i<l ; i++) {
        text = text.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
      }   
      return text; 
    },
    
    slugify:function(text) {
      var from = 'àáäâèéëêìíïîòóöôùúüûñç',
          to   = 'aaaaeeeeiiiioooouuuunc',
          text = text.toLowerCase();
          
      for (var i=0, l=from.length ; i<l ; i++) {
        text = text.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
      }
      
      return text.toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-{1,}/g,'-')
        .replace(/-$/,'')
        .replace(/^-/, '');
    },
    /*
      Transform spaces in undescore a url in a wiki url
      accordiong to http://en.wikipedia.org/wiki/Wikipedia:Page_name#Spaces.2C_underscores_and_character_coding
      convention. This is usefule when dealing with different stuff.
    */
    wikify: function (url) {
      return path.basename(url).replace(/%20/g, '_');
    },
    
    /*
      Transform a string of possible IDS in a list of valid,
      NUMERIC identifiers
    */
    toIds: function (ids) {
      return ids.split(',').filter(function (d) {
        return !isNaN(d)
      }).map(function (d) {
        return +d;
      });
    }
  },
  /**
    A bunch of useful geolocalisation helpers
  */
  geo: {
    
    /*
      Computate the haversine distance between two points in the geosphere
    */
    distance: function(A, B) {
      function toRadians(n) {
        return n * Math.PI / 180;
      };
      
      var R = 6371000, // metres
          φ1 = toRadians(A.lat),
          φ2 = toRadians(B.lat),
          Δφ = toRadians(B.lat-A.lat),
          Δλ = toRadians(B.lng-A.lng),
          a, c;

      a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
      c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

      return Math.round(R * c);
    }
  },
   /**
    Call yagoaida neo4j helper for people/place reconciliation.
    If there are no entities, res will contain an empty array but no error will be thrown.
    @return err, res
   */
  yagoaida: function (options, next) {
    services.yagoaida({
      text: options.text
    }, function (err, candidates) {
      if(err) {
        console.log('yagoaida', err)
        next(err);
        return;
      }
      
      var entities   = [],
          entitiesPrefixesToKeep = {
            YAGO_wordnet_district: 'location',
            YAGO_wordnet_administrative_district: 'location',
            YAGO_wordnet_person: 'person',
            YAGO_wordnet_social_group: 'social_group',
            YAGO_wordnet_institution: 'institution',
            YAGO_wordnet_organization: 'organization',
          };
      
      // adding context dict and oversimplify type
      candidates = candidates.map(function (d) {
        var _d = {
          name: d.readableRepr,
          links_wiki: module.exports.text.wikify(d.wikiLink),
          service: 'yagoaida'
        };
        
        _d.context = {
          left: d.startingPos,
          right: d.endingPos,
          matched_text: d.matchedText
        };
        
        _d.type = _.unique(_.compact(d.type.map(function (type) {
          var abstractType =  _.dropRight(type.split('_')).join('_');
          return entitiesPrefixesToKeep[abstractType]
        })));
        
        return _d;
      });
      
      next(null, candidates);
    })
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
              // read file
              // if(settings.cache.services)
              //   fs.readFile(path.join(settings.cache.services, )
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
  geonames: function(options, next) {
    var params = {
      address: options.text
    };
    if(options.language)
      params.lang = options.language
    module.exports.cache.read({
      namespace: 'services',
      ref: 'geonames:' + options.text
    }, function (err, contents) {
      if(contents) {console.log('using saved data')
        next(null, contents);
        return;
      }
      services.geonames(params, function (err, results) {
        if(err == IS_EMPTY)
          next(null, [])
        else {
          var results = results.map(function (location) {
            // add prefixes...
            return {
              lat:           location.lat,
              lng:           location.lng,
              fcl:           location.fcl,
              country:       location._country,
              geoname_fcl:     location.fcl,
              geoname_lat:     +location.lat,
              geoname_lng:     +location.lng,
              geoname_id:      location._id,
              geoname_q:       location._query,
              geoname_name:    location._name,
              geoname_country: location._country,
              __name:          location._name
            };
          });
          
          module.exports.cache.write(JSON.stringify(results), {
            namespace: 'services',
            ref: 'geonames:' + options.text
          }, function(err) {
            next(null, results);
          });
        } 
      });
    })
  },
  
  geocoding: function(options, next) {
    var params = {
      address: options.text
    };
    // if(options.language)
    //   params.language = options.language
    module.exports.cache.read({
      namespace: 'services',
      ref: 'geocoding:' + options.text
    }, function (err, contents) {
      if(contents) {
        next(null, contents);
        return;
      }
      services.geocoding(params, function (err, results) {
        if(err == IS_EMPTY)
          next(null, [])
        else if(err)
          next(err)
        else {
          var results = results.filter(function(location) {
            return location._fcl;
          }).map(function (location) {
            
            return {
              fcl:           location._fcl,
              lat:             +location.geometry.location.lat,
              lng:             +location.geometry.location.lng,
              country:         location._country,
              geocoding_fcl:     location._fcl,
              geocoding_lat:     +location.geometry.location.lat,
              geocoding_lng:     +location.geometry.location.lng,
              
              geocoding_id:      location._id,
              geocoding_q:       location._query,
              geocoding_name:    location._name,
              geocoding_country: location._country,
              __name:            location._name,
              
            };
          });
          module.exports.cache.write(JSON.stringify(results), {
            namespace: 'services',
            ref: 'geocoding:' + options.text
          }, function(err) {
            next(null, results);
          });
        }  
      }); 
    });
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
  /*
    options.start_date and options.start_time according to options.format.
    Cfr moment documentation.
    If options.strict is not present, the start date and the end_date will be rounded to the
    first available second and the last second respectively
  */
  reconcileIntervals: function(options, next) {
    var start  = moment.utc(options.start_date, options.format, options.strict),
        end    = options.end_date? moment.utc(options.end_date, options.format, options.strict): start.clone();
    
    if(!options.strict) {
      //if(!options.end_date) {
        end.add(24, 'hours').subtract(1, 'minutes');
        start.set('hour', 0);
      //}
    }
    
    result = {
      start_date: start.format(), // ISO format
      start_time: +start.format('X'),
      end_date: end.format(),
      end_time: +end.format('X'),
    };
    
    // calculate month
    result.start_month = moment.utc(result.start_time, 'X').format('YYYYMM');
    result.end_month   = moment.utc(result.end_time, 'X').format('YYYYMM');
    
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
        if(next)
          next(IS_EMPTY);
        return false;
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
    
    if(next)
      next(null, result);
    return result;
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
  /*
    Get the resource redirection url for a wikipedialink.
    link can be an array, too (but then you have to wait :-).
  */
  dbpediaRedirect: function(link, next) {
    var links     = typeof link == 'object'? link: [link],
        redirects = [],
        cache     = {};
    var q = async.queue(function (_link, nextLink) {
      if(cache[_link]) {
        console.log('skipping, already analyzed');
        redirects.push(cache[_link]);
        nextLink();
        return;
      }
      
      services.dbpedia({
        link: _link,
        followRedirection: false
      }, function (err, wiki) {
        var redirection = {};
        if(err) {
          redirection.redirectOf = undefined;
        } else if(_.size(wiki) == 0) {
          redirection.redirectOf = undefined;
        } else if(!wiki["http://dbpedia.org/resource/" + _link] || !wiki["http://dbpedia.org/resource/" + _link]["http://dbpedia.org/ontology/wikiPageRedirects"]) {
          redirection.redirectOf = _link;
        } else {
          redirection.redirectOf = path.basename(_.first(wiki["http://dbpedia.org/resource/" + _link]["http://dbpedia.org/ontology/wikiPageRedirects"]).value);
        }
        cache[_link] = redirection;
        redirects.push(redirection);
        setTimeout(nextLink, 5);
      });
    }, 1);
    q.push(links)
    q.drain = function() {
      next(null, redirects);
    }
  },
  /*
    EXPERIMENTAL.
    Given a list of objects having a context and optionally a wikilink, group them and evaluate differences between the different langauges / sercices.
    group the context. It is useful when dealing with multilingual alignement. 
    Entities MUST be at least:
    {
      context: {
      
      },
      service
    }
    for locations, they should also have *lat*, *lng*; cfr. helpers geo methods in this module.
    {
      service,
      geoquery,
      lat,
      lng
    }
  */
  cluster: function(entities, next) {
    var aligned     = [],
        withWiki    = [],
        withoutWiki = [];
    // step 1
    async.waterfall([
      //
      function disambiguateDbpediaRedirect (callback) {
            // entities having a wiki link
        withWiki = _.filter(entities, function (d) {
          return  d.links_wiki && d.links_wiki.length > 0
        });
        // ... and not
        withoutWiki = _.filter(entities, function (d) {
          return !d.links_wiki || !d.links_wiki.length
        });
    
        module.exports.dbpediaRedirect(_.map(withWiki, 'links_wiki'), function (err, redirects) {
          if(err) {
            callback(err);
            return
          }
          callback(null, _.merge(withWiki, redirects).concat(withoutWiki));
        })
      },
      
      
      function calculateTrustworthiness (candidates, callback) {   
        // assemble the entities found either by link or by name
        var aligned = _.values(_.groupBy(candidates, function (d) {
          if(d.redirects && d.redirects.length)
            return d.type + '_' + d.redirectOf
          return d.type + '_' + d.name
        })).map(function (aliases) {
          // ... then remap the extracted entities in order to have group of same entity.
          var _d = {
            name: _.first(_.unique(_.map(aliases, 'name'))),
            type: _.unique(_.flatten(_.map(aliases, 'type'))),
            services: _.unique(_.flatten(_.map(aliases, 'service'))),
            languages: _.unique(_.map(aliases, function (d) { 
              return d.context.language
            }))
          };
          // assemble various context related to the entity
          _d.context = _.flatten(_.map(aliases, function (d) {
            return d.context
          }));
          
          // get the unique wikilink for this group, if any. 
          var redirects = _.unique(_.flatten(_.map(aliases, 'redirectOf')));
          // ... and assign it
          _d.links_wiki = _.first(_.compact(_.unique(_.map(aliases, redirects.length? 'redirectOf': 'links_wiki')))) || ''
          return _d
        });

        callback(null, aligned);
      }
    ], function (err, aligned) {
      if(err)
        next(err);
      else
        next(null, aligned);
    });
  },
  /*
    Experimental: 
    Given a list of objects having lat and long
    {
      lat: 33,
      lng: 1,
      service : 'geonames',
      fcl : 'A',
      country: 'FR'
    }
  */
  geocluster: function(entities, next) {
    var amountOfServices = _.unique(_.map(entities, 'service')).length;
    
    // if there are more than one service, we disambiguate just the first entity for each service
    // services are meant for "suggestions": they provide the user with the amplest spectrum of possibilities.
    // e.g try the query France in geonames, the second result is 'Fort-de-France'
    if(amountOfServices > 1) {
      // entities = _.values(_.groupBy(entities, 'service')).map(function (d) {
      //   return _.first(d);
      // });
    }
    
    if(entities.length == 1) {
      next(null, entities.map(function (d) {
        d.trustworthiness = .5;
        return d
      }));
      return;
    }
    
    // calculate trustworthinsess
    var amountOfNames,
        amountOfCountries,
        amountOfFcls,
        
        combinations = [],
        best;
    
    for(var i=0; i < entities.length; i++) {
      for(var j= i + 1; j < entities.length; j++) {
        var distance = module.exports.geo.distance({
          lat: +entities[i].lat,
          lng: +entities[i].lng
        }, {
          lat: +entities[j].lat,
          lng: +entities[j].lng
        });
        combinations.push({
          left: entities[i],
          right: entities[j],
          distance: distance
        });
      }
    }
    
    best = _.first(_.sortBy(combinations, 'distance'));
    
    amountOfNames = _.unique(_.compact(_.map([best.left.__name, best.right.__name], function (d) {
      return d.trim().toLowerCase();
    }))).length;
    
    amountOfCountries = _.unique(_.compact(_.map([best.left.country, best.right.country], function (d) {
      return (d || '').trim().toLowerCase();
    }))).length;
    
    amountOfFcls = _.unique(_.compact(_.map([best.left.fcl, best.right.fcl], function (d) {
      return (d || '').trim().toLowerCase();
    }))).length;
    
    
    var merged = _.assign({
      name: _.unique(_.compact([best.left.__name, best.right.__name])).join(', '),
      lat: +_.first(_.unique([best.left.lat, best.right.lat])),
      lng: +_.first(_.unique([best.left.lng, best.right.lng])),
      fcl: _.unique([best.left.fcl, best.right.fcl]).join(', '),
      country: _.unique([best.left.country, best.right.country]).join(', '),
      trustworthiness:
        .1 * amountOfServices / _.size(settings.disambiguation.geoservices) + 
        .3 / amountOfNames + 
        .3 / amountOfCountries + 
        .1 / amountOfFcls + 
        (best.distance > 10000? 0 : (10000 - best.distance) / 10000) *.2 
    }, best.left, best.right);
    
    next(null, merged);
  },
  
  /*
    JSON cache and 
    options must contain 'namespace' and 'ref'
    e.g
    helpers.cache.write(contents, {
      namespace: 'services',
      ref: 'Rome, Italy'
    }, function(err) {
      // handle err
    })
  */
  cache: {
    /*
      
    */
    naming: function(options) {
      var md5 = require('md5');
      return path.join(settings.paths.cache[options.namespace], md5(options.ref) + '.json')
    },
    write: function(contents, options, next) {
      if(_.isEmpty(settings.paths.cache[options.namespace]))
        next(IS_EMPTY)
      else
        fs.writeFile(module.exports.cache.naming(options), contents, next)
    },
    read: function(options, next) {
      if(_.isEmpty(settings.paths.cache[options.namespace]))
        next(IS_EMPTY)
      else
        fs.readFile(module.exports.cache.naming(options), 'utf8', function (err, contents) {
          if(err)
            next(err);
          else {
            try {
              next(null, JSON.parse(contents))
            } catch(e) {
              next(null, contents);
            }
          }
        })
    },
    unlink: function(options, next) {
      if(_.isEmpty(settings.paths.cache[options.namespace]))
        next(IS_EMPTY)
      else
        fs.unlink(module.exports.cache.naming(options), next);
    }
  }
  
}
      