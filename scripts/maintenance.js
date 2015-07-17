/*
  Command line for maintenance purposes.
  
  1.
  
  
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
    
    _        = require('lodash'),

    prompt = require('prompt');
 

    
//   // 
//   // Start the prompt 
//   // 
//   prompt.start();
// /*
//   usage node maintenance.js --links_wiki
  
//   Perform entity duplicate cleaning on links. Sometime it happens that
//   an entity will be recognized later as wiki, there is the problem of mergin links.

//   MATCH (n:entity),(n2:entity)
//   WHERE id(n) <> id(n2)
//   AND n.links_wiki = n2.links_wiki
//   RETURN n,n2 LIMIT 20
// */
// if(options.date) { // check date please, and remove dummy properties.
//   async.waterfall([
//     function get_resources (next) {
//       var limit = +options.limit || 1000,
//           offset = +options.offset || 0;
      
//       neo4j.query('MATCH (res:resource) WHERE has(res.date) RETURN res SKIP {offset} LIMIT {limit}', {
//         limit:limit,
//         offset: offset
//       }, function (err, resources) {
//         if(err)
//           throw err;
//         console.log(clc.blackBright('  analyse all the resources having a date'), clc.white.bgMagenta(resources.length))
//         var languages = ['fr', 'en', 'es'];
        
//         var q = async.queue(function (resource, nextResource) {
//           var dates;
//           console.log('\n',clc.blackBright('    remaining ', clc.white(q.length()), 'resources'))
//           for(var i in languages) {
//             dates = helpers.reconcileHumanDate(resource.date, languages[i]);    
//             if(!isNaN(dates.start_time))
//               break;
//           }
//           // firstly, try with the title
//           if(resource.languages && (isNaN(dates.start_time) || isNaN(dates.end_time))){
//             for(var i in resource.languages) {
//               if(resource['title_' + resource.languages[i]]) {
//                 dates = helpers.reconcileHumanDate(resource['title_' + resource.languages[i]], resource.languages[i]);    
//                 if(!isNaN(dates.start_time))
//                   break;
//               }
//             };
//           };
          
//           if(resource.languages && (isNaN(dates.start_time) || isNaN(dates.end_time))){
//             for(var i in resource.languages) {
//               if(resource['caption_' + resource.languages[i]]) {
//                 dates = helpers.reconcileHumanDate(resource['caption_' + resource.languages[i]], resource.languages[i]);    
//                 if(!isNaN(dates.start_time))
//                   break;
//               }
//             };
//           };
          
//           if(isNaN(dates.start_time) || isNaN(dates.end_time)){
//             console.log(resource)
//             console.log(clc.redBright('', resource.date))
            
            
//             neo4j.query('MATCH (res:resource) WHERE id(res) = {id} REMOVE res.start_date, res.end_date, res.start_time, res.end_time', {
//               id: resource.id
//             }, function (err) {
//               if(err)
//                 throw err;
//               console.log(clc.blackBright('     time properties:   ', clc.redBright('removed'), 'for id', clc.white(resource.id)));
              
//               setTimeout(nextResource, 5000);
//             })
//             return;
//           }
          
//           if(dates.start_time == resource.start_time && dates.end_time == resource.end_time) {
//             console.log(clc.blackBright('     result:   ', clc.greenBright('ok')));
//             nextResource();
//           } else {
//             console.log(clc.blackBright('     result:   ', clc.yellowBright('replacing'),
//               dates.start_time == resource.start_time? 'start': clc.redBright('start'),
//               dates.end_time == resource.end_time? 'end': clc.redBright('end')
//             ));
//             resource.start_time = dates.start_time;
//             resource.end_time   = dates.end_time;
//             resource.start_date = dates.start_date;
//             resource.end_date   = dates.end_date;
//             neo4j.save(resource, function (err) {
//               if(err)
//                 throw err;
//               console.log(clc.blackBright('     result:   ', clc.yellowBright('cleaned')));
//               nextResource();
//             })
            
//           }
//         }, 1);
//         q.push(resources)
//         q.drain = next;
//         // console.log(dates)
//         // console.log(resources[0].date, resources[0].start_date, resources[0].end_date, resources[0].start_time, resources[0].end_time)
//         // 
        
//       })
      
//     }
//   ], function() {
//     console.log(clc.cyanBright('date waterfall completed'));
//     console.log()
//   })
// }
// if(options.links_wiki) {
//   async.waterfall([
//     function get_entity_duplicates_by_wiky (next) {
//       /*
//         There is the need of reconiling links wiki
//         AUTOMATIC MERGE OF THE SAME ENTITY: same wikilink and same name.
//       */
//       neo4j.query(queries.get_entity_duplicates_by_wiky, function (err, duplicates) {
//         console.log(clc.blackBright('  get_entity_duplicates_by_wiky'), clc.white.bgMagenta(duplicates.length))
//         var q = async.queue(function (duplicates, nextDuplicates) {
//           // get the very first entity as PRIMARY entity
//           var superego = _.max(duplicates.ent, function(d) {
//             return d.services? d.services.length: 0;
//           });
//           console.log(superego.name, superego.id, _.map(duplicates.ent, 'name'), _.map(duplicates.ent, 'id'),_.map(duplicates.ent, function(d) {
//             return d.services? d.services.length: 0
//           }));
//           //console.log(superego)
          
//           // for each duplicates ent, get all the relationships
//           var q1 = async.queue(function (entity, nextEntity) {
//             if(entity.id == superego.id) {
//               console.log('ignore my superego', superego.id, entity.id)
//               nextEntity();
//               return;
//             }
//             neo4j.query(queries.get_entity_relationships, {
//               alter_id: entity.id
//             }, function (err, triplet) {
//               if(err)
//                 throw err;
//               var txn = neo4j.batch();
//               //console.log('my ', triplet, 'query',entity.id, triplet.length)
              
//               for(var t in triplet) {
//                 var source_id,
//                     target_id;
                
//                 if(triplet[t].alter_id == triplet[t].r.start) {
//                   source_id = superego.id;
//                   target_id = triplet[t].r.end;
//                 } else if(triplet[t].alter_id == triplet[t].r.end) {
//                   source_id = triplet[t].r.start;
//                   target_id = superego.id;
//                 } else {
//                   throw 'impossible'
//                 };
//                 console.log('cloning (',triplet[t].r.start,')-[r:', triplet[t].r.type ,']->(',triplet[t].r.end,')');
//                 // copy rels
//                 txn.query(
//                   ' MATCH (source), (target)' +
//                   ' WHERE id(source)={source_id} AND id(target)={target_id}' + 
//                   ' WITH source, target '+
//                   ' MERGE (source)-[r:'+ triplet[t].r.type +']->(target)' +
//                 ' RETURN source, target, r', {
//                   source_id: source_id,
//                   target_id: target_id
//                 });
//                 txn.rel.delete(triplet[t].r)
//                 // delete rels
//               }
//               txn.node.delete(entity.id)
              
//               txn.commit(function (err, results) {
//                 if(err)
//                   throw err;
//                 console.log(results.length)
//                 nextEntity();
//               });
//             });
//           },1);
//           q1.push(duplicates.ent);
//           q1.drain = nextDuplicates(); 
//         },1);
        
//         q.push(duplicates)
//         q.drain = next;
//       });
//     },
//     /*
//       Output a crowdsourcing activities FOR very very expert only.
//     */
//     function get_entity_duplicates_candidates_by_wiky (next) {
      
//       neo4j.query(queries.get_entity_duplicates_candidates_by_wiky, function (err, candidates) {
//         console.log(clc.blackBright('  get_entity_duplicates_candidates_by_wiky'), clc.white.bgMagenta(candidates.length));
        
//         next()
//       })
    
//     },
//   ], function() {
//     console.log(clc.cyanBright('waterfall completed'));
//     console.log()
//   });
// }

/*
  helper to print out a csv file, to be used in a waterfall, with err
*/
function printCSV(options, next) {
  
  
  csv.stringify(options.records, {
      delimiter: options.delimiter || '\t',
      columns:   options.fields,
      header:    true
    }, function (err, data) {
      fs.writeFile(settings.paths.crowdsourcing + '/' + 'maintenance.'+options.name+'.csv',
         data, function (err) {
        if(err) {
          next(err);
          return
        }
        next();
      })
    });
}

if(options.entities) {
  var maintenance = require('../scripts/maintenance.entities');
  console.log(clc.blackBright('waterfall for'),clc.yellowBright('maintenance.entities'))
  // the waterfall
  async.waterfall([
    maintenance.get_entity_duplicates_by_wiky,
    printCSV
  ], function (err) {
    if(err){
      console.log(err)
      console.log(clc.blackBright('waterfall for'),clc.yellowBright('maintenance.entities'), clc.redBright('failed'))
    } else {
      console.log(clc.blackBright('waterfall for'),clc.yellowBright('maintenance.entities'), clc.cyanBright('completed'))
    }
  });
}

if(options.homonyms) {
  var maintenance = require('../scripts/maintenance.entities');
  console.log(clc.blackBright('waterfall for'),clc.yellowBright('maintenance.homonyms'))

  async.waterfall([
    maintenance.get_entity_homonyms,
    printCSV
  ], function (err) {
    if(err){
      console.log(err)
      console.log(clc.blackBright('waterfall for'),clc.yellowBright('maintenance.entities'), clc.redBright('failed'))
    } else {
      console.log(clc.blackBright('waterfall for'),clc.yellowBright('maintenance.entities'), clc.cyanBright('completed'))
    }
  });
}