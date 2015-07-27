/*
  
 special script to index node full text correctly

*/


var fs = require('fs'),
    csv = require('csv'),
    settings = require('../settings'),
    helpers  = require('../helpers')
    options  = require('minimist')(process.argv.slice(2)),
    
    queries  = require('decypher')('queries/maintenance.cyp'),
    neo4j    = require('seraph')(settings.neo4j.host),
    async    = require('async'),
    
    clc = require('cli-color'),
    
    S = require('string'),
    _        = require('lodash');
    
    
if(options.entity) {
  console.log(clc.blackBright('waterfall for building '),clc.yellowBright('lucene index for entities'))
  // async.waterfall([
  //   function getTotalAmoutOfPersons (callback) {   
  //     neo4j.query(''+
  //       'MATCH (per:person) '+
  //       '  WHERE has(per.name_search) OR has(res.title_fr) OR has(res.name) '+
  //       '  RETURN count(*) as total_count', function (err, result) {
  //         if(err)
  //           return callback(err);
  //         callback(null, result.total_count);
  //     });
    
  //   },
}
  
if(options.resource) {
  console.log(clc.blackBright('waterfall for building '),clc.yellowBright('lucene resource index'))
  
  async.waterfall([
    function getTotalAmoutOfResources (callback) {   
      neo4j.query(''+
        'MATCH (res:resource) '+
        '  WHERE not(has(res.full_search)) AND (has(res.title_en) OR has(res.title_fr) OR has(res.name)) '+
        '  RETURN count(*) as total_count', function (err, result) {
          if(err)
            return callback(err);
          callback(null, result.total_count);
      });
    
    },
    
    function buildIndex (total_count, callback) {
      var loops = Math.ceil(total_count / 100);
      async.timesSeries(loops, function (n, next) {
        console.log(n);
        neo4j.query(''+
          ' MATCH (res:resource) '+
          '  WHERE not(has(res.full_search)) AND (has(res.title_en) OR has(res.title_fr) OR has(res.name)) '+
          '  RETURN {id: id(res), name:res.name, doi: res.doi, archive: [res.name, res.source, res.caption], translations: [res.title_en, res.title_fr, res.caption_fr, res.caption_en]}'+
          ' SKIP {offset} LIMIT {limit}', {
            limit: 100,
            offset: n*100
          }, function (err, triplets) {
            if(err)
              return next(err);
            
            var q = async.queue(function (triplet, nextTriplet) {
              console.log(clc.blackBright("processing id =", clc.whiteBright(triplet.id), triplet.doi, "remaining", clc.magentaBright(q.length())));
              var contentToIndex = _.compact(_.values(triplet.translations)).join(' ').toLowerCase();
              if(!contentToIndex.length) {
                contentToIndex = _.compact(_.values(triplet.archive)).join(' ').toLowerCase();
              }
              
              if(!contentToIndex.length) {
                console.log(triplet.translations)
                throw 'not enough content'
              }
              contentToIndex = _.compact([ triplet.doi, contentToIndex]).join(' ');// + ' ' + helpers.text.translit(contentToIndex);
              neo4j.query(''+
                ' MATCH (res:resource) '+
                '  WHERE id(res) = {id} SET res.full_search = {full_search}', {
                  id: triplet.id,
                  full_search: S(contentToIndex).stripTags().s
              }, function (err) {
                if(err)
                  throw err;
                nextTriplet();
              })
            }, 10);
            q.push(triplets);
            q.drain = next;
            // var contentToIndex = _.compact(triplets.translations).join(' ');
            // if(!contentToIndex.length) {
            //   console.log(triplets)
            //   throw 'finished !';
            // }
            // // neo4j.query(' MATCH (res:resource) '+)
            // next();
        });
      
      }, function (err, users) {
        if(err)
          return callback(err);
        callback();
      });
    }
  ], function (err) {
    if(err){
      console.log(err)
      console.log(clc.blackBright('waterfall for'),clc.yellowBright('maintenance.entities'), clc.redBright('failed'))
    } else {
      console.log(clc.blackBright('waterfall for'),clc.yellowBright('maintenance.entities'), clc.cyanBright('completed'))
    }
  });
  
  return;
}


  
  
console.log(options)
console.log('task', clc.redBright('not found'));