/**
  Custom date extractor from a given (short) text.
  Takes the resources not tagged with date field and try to tag'em
*/
var settings   = require('../settings'),
    helpers    = require('../helpers.js'),
    
    chrono     = require('chrono-node'),
    moment     = require('moment'),
    Langdetect = require('languagedetect'),
    langdetect = new Langdetect('iso2'),
    neo4j = require('seraph')(settings.neo4j.host),
    async = require('async'),
    _     = require('lodash');


/*
  This queue for each resource NOT HAVING a date field, try:
    1. to find the first two consecutive dates in the given field

*/
var queue = async.waterfall([
    // get pictures and documents having a caption
    function (next) {
      neo4j.query('MATCH (n:`resource`) WHERE not(has(n.date)) OR n.date = "-" RETURN n', function (err, nodes) {
        if(err)
          throw err;
        
        next(null, _.takeRight(nodes, 3324))
      });
    },
    
    function (resources, next) {
      var remainings = [];

      var q = async.queue(function (resource, nextResource) {
        var context = resource.name || resource.title;
        context = resource.caption_en || resource.caption_en;
        
        console.log(resource.id, ' remaining', q.length())
        console.log('context', context)
        if(!context) {
          nextResource();
          return;
        }
        
        var language = langdetect.detect(context).shift().shift(),
            dates =  chrono.parse(context);

        //console.log(context, language, resource.id, 're', q.length())
        
        if(!dates.length) {
          helpers.reconcileHumanDate(context, language, function(err, dates){
            if(err || isNaN(dates.start_time)) {
              remainings.push(resource);
              nextResource();
              return;
            }
            resource = _.assign(resource, {
              date: dates.text_date,
              start_date: dates.start_date,
              start_time: dates.start_time,
              end_date: dates.end_date,
              end_time: dates.end_time
            });
            // console.log(resource)
            neo4j.save(resource, function(err, node) {
              if(err) {
                console.log(n);
                throw err;
              }    
              nextResource();
            });
            
          });
          return;
        }
        moment.locale(language);  
        var start_date = moment.utc(dates[0].start.date()).set('hour', 0),
            end_date   = moment(start_date).add(24, 'hours').subtract(1, 'minutes');
            
        console.log('   ', start_date.toISOString(), end_date.toISOString());
        //n = _.assign(n, dates);
        resource = _.assign(resource, {
          date: dates[0].text,
          start_date: start_date.toISOString(),
          start_time: +start_date.format('X'),
          end_date: end_date.toISOString(),
          ent_time: +end_date.format('X')
        });

        neo4j.save(resource, function(err, node) {
          if(err) {
            console.log(n);
            throw err;
          }
          nextResource();
        });

      }, 5);
      q.push(resources)
      q.drain = function(){
        next(null, remainings)
      }
    },
    // get the first date from the other context.
    function (remainings, next) {
      var irreconciliables = [];
      var q = async.queue(function (resource, nextResource) {
        var context = resource.source;
        if(!context) {
          nextResource();
          return;
        }
        // get language
        var language = langdetect.detect(context).shift().shift(),
            dates =  chrono.parse(context);
        console.log()
        console.log(context, dates);

        if(dates.length) {
          moment.locale(language);  
          var start_date = moment.utc(dates[0].start.date()).set('hour', 0),
              end_date   = moment(start_date).add(24, 'hours').subtract(1, 'minutes');
          
          resource = _.assign(resource, {
            date: dates[0].text,
            start_date: start_date.format(),
            start_time: +start_date.format('X'),
            end_date: end_date.format(),
            end_time: +end_date.format('X')
          });

          neo4j.save(resource, function(err, node) {
            if(err) {
              console.log(n);
              throw err;
            }
            nextResource();
          });
          return;
        }
        // otherwise try to extract the very first numerical seqiuence looking like a date
       
        helpers.reconcileHumanDate(context, language, function(err, dates){
          if(err || isNaN(dates.start_time)) {
            irreconciliables.push(resource);
            nextResource();
            return;
          }
          resource = _.assign(resource, {
            date: dates.text_date,
            start_date: dates.start_date,
            start_time: dates.start_time,
            end_date: dates.end_date,
            end_time: dates.end_time
          });
          console.log(resource)
          neo4j.save(resource, function(err, node) {
            if(err) {
              console.log(n);
              throw err;
            }    
            nextResource();
          });
        });

      }, 1);

      q.push(remainings);
      q.drain = function(){
        console.log('irreconciliables', irreconciliables.length)
        next(null);
      }
    }

  ], function(){
    console.log('completed');
  });