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
        level = options.level || 0;// recursion level, see below
    console.log('dbpediq service:', url);
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
        
        if(redirect && redirect.value && level < 1) {
          var link = redirect.value.split('/').pop();
          console.log('following redirection, level', level, 'link', link)
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
    console.log(url);
    request
      .get({
        url: url
      }, function (err, res, body) {
        if(err) {
          next(err);
          return;
        }
        
        next(null, body);
      });
  },
  
  yagoaida: function(options, next) {
    if(!settings.yagoaida || !settings.yagoaida.endpoint) {
      next('settings.yagoaida.endopoint not found')
      return;
    }
    console.log(settings.yagoaida.endpoint, options.text)
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
        console.log('yagoaida', err, body)
        
        if(err)
          next(err);
        
      });
  }
  
};