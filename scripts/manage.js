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
    options     = require('minimist')(process.argv.slice(2));
    async       = require('async'),
    _           = require('lodash'),
    clc         = require('cli-color'),
    
    tasks       = require('require-all')({
                    dirname: __dirname + '/tasks',
                    filter  :  /(.*).js$/
                  }),
    
    availableTasks = {
      'setup': [
        tasks.setup
      ],
      'discover-resource': [
        tasks.resource.discoverOne
      ],
      'discover-resources': [
        tasks.resource.discoverMany
      ],
      'import-resources': [
        tasks.helpers.csv.parse,
        tasks.helpers.marvin.create,
        tasks.resource.importData,
        tasks.helpers.marvin.remove
      ],
    };

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
  }
].concat(availableTasks[options.task]), function (err) {
  if(err) {
    console.warn(err);
    console.log(clc.blackBright('\n task'), clc.whiteBright(options.task), clc.redBright('exit with error'));
  } else
    console.log(clc.blackBright('\n task'), clc.whiteBright(options.task), clc.cyanBright('completed'));
  
  console.log("\n\n")
});


