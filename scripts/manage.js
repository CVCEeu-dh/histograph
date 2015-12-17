/*
  Import tsv file into Neo4J
  ---
  
  Import UTF8 tsv data into neo4j.
  Schema
  languages: en,fr comma separated
    
  all other fields will be stored as well.
  Note that if a slug field is present.
  
  task=
*/
var fs          = require('fs'),
    settings    = require('../settings'),
    options     = require('minimist')(process.argv.slice(2));
    async       = require('async'),
    _           = require('lodash'),
    clc         = require('cli-color'),
    
    tasks       = require('require-all')({
                    dirname: __dirname + '/tasks',
                    filter  :  /(.*).js$/
                  }),
    
    availableTasks = _.assign({
      'setup': [
        tasks.setup.indexes,
        // Not enabled, since we're only using auto_index // tasks.lucene.drop,
        // Not enabled, since we're only using auto_index // tasks.lucene.init
      ],
      
      'index': [
        tasks.lucene.update
      ],
      'discover-resource': [
        tasks.resource.discoverOne
      ],
      'discover-resources': [
        tasks.resource.discoverMany
      ],

      /*
        Merge entities given by --ids
      */
      'merge-entities': [
      tasks.entity.cleanSimilarity, 
        tasks.entity.getClustersByWiki,
        tasks.entity.mergeMany
      ],

      /*
        Enrich entities with wikidata, viaf and co
        based on their wikilinks
      */
      'enrich-person':[
        tasks.entity.getOne,
        tasks.entity.enrich
      ],

      'enrich-people': [
        tasks.entity.getMany,
        tasks.entity.enrich
      ],
      /*
        computate (ent:entity:person)--(ent:entity:person) links
        based on similarity
      */
      'calculate-similarity': [
        tasks.entity.tfidf,
        tasks.entity.cleanSimilarity,   
        tasks.entity.jaccard,
        tasks.entity.cosine
      ],
      
      'chunks': [
        tasks.entity.getMany,
        tasks.entity.chunks
      ],
      
      'query': [
        tasks.helpers.cypher.raw
      ],
      
      /*
        simulate ctrl requests for an already auth user.
        It makes uses of test environment
      */
      'api': [
        tasks.helpers.marvin.create,
        tasks.helpers.marvin.login,
        tasks.helpers.marvin.api,
        tasks.helpers.marvin.logout,
        tasks.helpers.marvin.remove,
      ],
      
      'text-of-resource': [
        tasks.resource.getOne,
        tasks.resource.getText
      ]
    }, settings.availableTasks || {});

console.log(clc.whiteBright( "\n\n +-+-+ "));
console.log(clc.whiteBright( " |H|G| "));
console.log(clc.whiteBright( " +-+-+ \n\n"));

if(!availableTasks[options.task]) {
  console.log(clc.blackBright(' task', clc.whiteBright(options.task || 'null'), clc.redBright('not found'), 'please specify a valid', clc.whiteBright('--task'),'param'));
  console.log(clc.blackBright(' available tasks: '), _.keys(availableTasks));
  console.log("\n\n");
  return;
} 

// the waterfall specified for the task
async.waterfall([
  // send initial options
  function init(callback) {
    callback(null, options);
  },
  tasks.helpers.tick.start
].concat(_.map(availableTasks[options.task],function (d){
  
  if(typeof d == 'function')
    return d;
  return _.get(tasks, d.replace('tasks.', ''))
})).concat([tasks.helpers.tick.end]), function (err) {
  if(err) {
    console.warn(err);
    console.log(clc.blackBright('\n task'), clc.whiteBright(options.task), clc.redBright('exit with error'));
  } else
    console.log(clc.blackBright('\n task'), clc.whiteBright(options.task), clc.cyanBright('completed'));
  
  console.log("\n\n")
});


