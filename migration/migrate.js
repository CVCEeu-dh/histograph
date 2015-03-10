var fs = require('fs'),

    settings = require('./settings'),
    request  = require('request'),
    async    = require('async'),
    xml      = require('xml2js'),
    _        = require('lodash'),

    neo4j    = require('seraph')(settings.neo4j.host),

    transaction = neo4j.batch();

    

// ics file names, one for each picture
var ics = fs.readdirSync(settings.ICSPath);

// unique readable id for dbpedia entity with resource link
function getSlug(text){
  return text.toString().toLowerCase()
  .replace(/\s+/g, '_') // Replace spaces with -
  .replace(/[^\w\_]+/g, '') // Remove all non-word chars
  .replace(/\_\_+/g, '_') // Replace multiple - with single -
  .replace(/^_+/, '') // Trim - from start of text
  .replace(/_+$/, ''); // Trim - from end of text
} 

console.log('migrating ' +ics.length);

var media = [];

// for each ic file
var filequeue = async.queue(function (task, callback) {
    console.log('starting waterfall for ' + task.name);
    async.waterfall([
      // 1. get file content
      function(next) { 
        console.log('  1 waterfall for ' + task.name);
        next(null, fs.readFileSync(settings.ICSPath + '/' + task.name));
      },
      // 2. get xml structure for file content
      function(contents, next) { // GET xml
        console.log('  2 waterfall for ' + task.name);
        xml.parseString(contents, {explicitArray: false}, function (err, result) {
          next(null, result);
        });
      },
      // 3. identify resources
      function(result, next) { // GET xml
        console.log('  3 waterfall for ' + task.name);
        var resources = [];

        if(!result || !result.image_content || !result.image_content.objects.object) {
          console.log('empty result, skipping xml');
          next(null, resources);
          return;
        }

        if(result.image_content.objects.object.length) {
          for(var i in result.image_content.objects.object) {
            var resource = {};
            resource.region  = result.image_content.objects.object[i].region;
            if(result.image_content.objects.object[i].identification)
              resource.identification  = result.image_content.objects.object[i].identification._;
            resources.push(resource);
          };
        } else {
          resources.push({
            region: result.image_content.objects.object.region,
            identification: result.image_content.objects.object.identification._
          })
        }

        next(null, resources);
      },
      // 4. execute dbpedia chain
      function(resources, next) {
        console.log('  4 waterfall for ' + task.name);
        
        if(!resources.length) {
          console.log('empty resource, skipping dbpedia');
          next(null, 'done');
          return;
        }
        
        var dbpediaqueue = async.queue(function (resource, dbcallback) {
          // request dbpedia for persons
          // request.get('http://lookup.dbpedia.org/api/search.asmx/PrefixSearch?QueryClass=person&MaxHits=5&QueryString=' +  resource.identification, function (err, res, body) {
          //   if(err) {
          //     resource.error = err;
          //     dbcallback();
          //   } else {  // parse xml of the response
          //     xml.parseString(body, function(err, result) {
          //       if(err) {
          //         resource.error = err;
          //       } else {
          //         //console.log(result.ArrayOfResult.Result[0])
          //         resource.dbpedia = {
          //           uri: result.ArrayOfResult.Result[0].URI[0],
          //           label: result.ArrayOfResult.Result[0].Label[0],
          //           description: result.ArrayOfResult.Result[0].Description[0]
          //         };
          //       }
          //       dbcallback();
          //     });
          //   }
          // });
          dbcallback();
        });
        
        dbpediaqueue.push(resources, function(){

        });

        dbpediaqueue.drain = function() {
          console.log('all items have been processed');
          next(null, 'done');
        };
      }

    ], function (err, result) {
      // result now equals 'done'    
      console.log('ENDING waterfall for ' + task.name, result);
      callback();
    });
    
}, 1);

// add each ics file to the queue
for( var i = 0 ; i < ics.length; i++) {
  filequeue.push({name: ics[i]}, function (err) {
    console.log('--- finished processing foo', ics[i]);
  });
}
// assign a callback
filequeue.drain = function() {
    console.log('all items have been processed');
}

return;
// for( var i = 0 ; i < ics.length; i++) {
//   console.log('    file: ', ics[i]);



//   async.waterfall([
//     function(callback) { // get file content

//     },
//     function()
//   var contents = fs.readFileSync(settings.ICSPath + '/' + ics[i]);

// }

return;
fs.readFile(settings.ICSPath + '/' + ics[0], function(err, content) {
  console.log('file', ics[0])

  // var resource_node = transaction.save({
  //   name: ics[0]
  // });
  resource_node = slugify(ics[0]);

  transaction.query('MERGE ({slug}:Resource) RETURN {slug}, labels({slug})', {
    slug: resource_node
  });
  //console.log('resource', resource_node);
  //transaction.label(resource_node, 'Resource');

  // for each object
  //   get the corresponding dbpedia ID FIRST CANDIDATE, then
  //   save region as markdown comment 
  //   use markdown comments jade like, separate objects with a md line ---
  //   ```
  //     dbpedia: http://dbpedia.org/resource/Helmut_Kohl
  //     
  //     region: [>top, >left, >right, >bottom]
  //     perspective: EyeLevel
  //     occlusion: None
  //     gender: Male
  //     ---
  //     
  //   ```
  //   add then the link to the object / dbpedia resources (filterlike) in a markdown Simple text 
  //
  //    
  //   save in a version node (n:resource) both markdown AND Simple text
  xml.parseString(content, {explicitArray: false}, function (err, result) {
    var resources = [];

    if(result.image_content.objects.object.length) {
      for(var i in result.image_content.objects.object) {
        var resource = {};
        resource.region  = result.image_content.objects.object[i].region;
        resource.identification  = result.image_content.objects.object[i].identification._;
        resources.push(resource);
      };
    } else {
      resources.push({
        region: result.image_content.objects.object.region,
        identification: result.image_content.objects.object.identification._
      })
    };
    
    var q = async.queue(function (resource, callback) {
        //console.log('hello ' + resource.identification);
        resource.completed = true;
        
        request.get('http://lookup.dbpedia.org/api/search.asmx/PrefixSearch?QueryClass=person&MaxHits=5&QueryString=' +  resource.identification, function (err, res, body) {
          if(err) {
            resource.error = err;
            callback();
          } else {  // parse xml of the response
            xml.parseString(body, function(err, result) {
              if(err) {
                resource.error = err;
              } else {
                //console.log(result.ArrayOfResult.Result[0])
                resource.dbpedia = {
                  uri: result.ArrayOfResult.Result[0].URI[0],
                  label: result.ArrayOfResult.Result[0].Label[0],
                  description: result.ArrayOfResult.Result[0].Description[0]
                };
              }
              callback();
            });
          }
        });
    });

    // at the end of queue chain,
    // 1) let's add nodes:Entity (if they do not exist, cfr URI as "unique" field)
    // 2) let's add relationships :CONTAINS
    q.drain = function() {
      console.log('all items have been processed', resources.length);

      // for(var i=0; i < resources.length; i++) {
      //   // if resources has dbpedia info, otherwise skip.
      //   // var entity_node = transaction.save({
      //   //   label: resources[i].dbpedia.label,
      //   //   uri: resources[i].dbpedia.uri,
      //   //   description: resources[i].dbpedia.description
      //   // })//, 'entity', 'uri', resources[i].dbpedia.uri);

      //   var entity_node = transaction.save({
      //     name: resources[i].dbpedia.label,
      //     uri: resources[i].dbpedia.uri,
      //     description: resources[i].dbpedia.description,
      //   });
      //   // console.log(entity_node, resource_node);
      //   transaction.label(entity_node, 'Entity');
      //   transaction.relate(entity_node, 'APPEARS', resource_node);
      // }

      transaction.commit(function (err, results) {
        console.log('and added to the database', err,results);
      });
    };

    q.push(resources, function (err) {});



    // for(var i=0; i < resources.length; i++) {
    //   var next = function() {
    //     return 
    //   };

    //   request.get('http://lookup.dbpedia.org/api/search.asmx/PrefixSearch?QueryClass=person&MaxHits=5&QueryString=' + resources[i].identification, (function (item) {
    //     return function(err, res) {
    //       console.log(res, item)
    //     }
    //   })(resources[i]))
    // }
  })
})
// xml.parseString(xml, function (err, result) {
//     console.dir(result);
// });