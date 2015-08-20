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
    console.log(clc.blackBright('dbpedia service:'), url);
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
          extractors: 'entities'
        }, options);
    request
      .post({
        url: settings.textrazor.endpoint,
        json: true,
        form: form
      }, function (err, res, body) {
        if(err) {
          next(err);
          return;
        }
        // console.log(form, 'body', body.response)
        next(null, body.response.entities || []);
      })
  },
  /*
    VIAF reconciliation service.
    @param options.link
  */
  viaf: function(options, next) {
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
  
  yagoaida: function(options, next) {
    if(!settings.yagoaida || !settings.yagoaida.endpoint) {
      next('settings.yagoaida.endopoint not found')
      return;
    }
    // console.log('AIDA')
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
        if(err)
          next(err);
        // FLATTEN YAGO entities by providing only entitites having "best entity"
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
  
  geonames: function(options, next) {
    request.get({
      url: "http://api.geonames.org/searchJSON",
      json: true,
      qs: _.assign({
        maxRows: 1,
        style: 'long',
        username: settings.geonames.username
      }, options, {
        q: encodeURIComponent(options.address)
      })
    }, function (err, res, body) {
      if(err) {
        next(err);
        return;
      }

      if(!body.geonames || !body.geonames.length) {
        next(IS_EMPTY);
        return;
      };
      var name = _.unique([body.geonames[0].toponymName, body.geonames[0].countryName]).join(', ');
      console.log(name, '----->', options.address);
      
      next(null, [_.assign(body.geonames[0], {
        name: name,
        query: options.address
      })])
    })
  }
};