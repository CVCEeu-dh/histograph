/*
  Available external Services
  
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