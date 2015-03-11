/**
  This special ,script works with a collection of ics files - usually connected with same name images.
  The ics path has to be set in settings.js.
  A file example can be found under ./migration/picture.example.ic
*/
var fs = require('fs'),

    settings = require('./settings'),
    request  = require('request'),
    async    = require('async'),
    xml      = require('xml2js'),
    YAML     = require('yamljs'),
    _        = require('lodash'),

    neo4j    = require('seraph')(settings.neo4j.host),

    batch = neo4j.batch();



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

console.log('migrating ' +ics.length, YAML.stringify({1:3},2));

// truncate neo4j db ...


var media = {},
    entities = {}; // that is, dbpedia entities found

// for each ic file
var filequeue = async.queue(function (task, callback) {
    console.log('starting waterfall step for ' + task.name);
    async.waterfall([
      // 1. get file content
      function(next) { 
        console.log('  1 waterfall step for ' + task.name);
        next(null, fs.readFileSync(settings.ICSPath + '/' + task.name));
      },
      // 2. get xml structure for file content
      function(contents, next) { // GET xml
        console.log('  3 waterfall step for ' + task.name);
        xml.parseString(contents, {explicitArray: false}, function (err, result) {
          next(null, result);
        });
      },
      // 3. identify resources
      function(result, next) { // GET xml
        console.log('  4 waterfall step for ' + task.name);
        var resources  = [],
            properties = {
              name: ''+task.name
            };

        // get image metadata
        if(result && result.image_content) {
          properties.width = result.image_content.image.width,
          properties.height = result.image_content.image.height
        }
        // skip if there is no object
        if(!result || !result.image_content || !result.image_content.objects.object) {
          console.log('empty result, skipping xml');
          next(null, resources, properties);
          return;
        }
        // otherwise evaluate objects
        if(result.image_content.objects.object.length) {
          for(var i in result.image_content.objects.object) {
            var resource = {};
            resource.region  = result.image_content.objects.object[i].region;
            if(result.image_content.objects.object[i].markers)
              resource.markers  = result.image_content.objects.object[i].markers;
              // console.log('MMM', resource.markers);
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

        next(null, resources, properties);
      },
      /*
      
        4. execute dbpedia chain
        ===
      */
      function(resources, properties, next) {
        console.log('  5 waterfall step for ' + task.name);
        media[''+task.name] = {
          properties: properties
        };

        if(!resources.length) {
          console.log('empty resource, skipping dbpedia');
          next(null, 'done');
          return;
        }

        var dbpediaqueue = async.queue(function (resource, dbcallback) {
          if(!resource.identification && !resource.region) { // just skip it
            dbcallback();
            return;
          }

          if(resource.identification == 'unknown' || !resource.identification) {
            // res node is incomplete basically...
            if(!entities.unknown)
              entities.unknown = {
                properties: {
                  name: 'unknown'
                },
                links: []
              }
            entities.unknown.links.push({
              node: ''+ task.name,
              region: _.extend(resource.region),
              markers: _.extend(resource.markers)
            });

            dbcallback();
            return;
          };

          // request dbpedia for persons
          request.get('http://lookup.dbpedia.org/api/search.asmx/PrefixSearch?QueryClass=person&MaxHits=5&QueryString=' +  resource.identification, function (err, res, body) {
            if(err) {
              resource.error = err;
              dbcallback();
            } else {  // parse xml of the response
              xml.parseString(body, function(err, result) {
                if(err) {
                  resource.error = err;
                } else if(result && result.ArrayOfResult && result.ArrayOfResult.Result) {

                  var entity_slug = getSlug(result.ArrayOfResult.Result[0].URI[0]);
                  if(!entities[entity_slug]) {
                    entities[entity_slug] = {
                      properties: {
                        uri: result.ArrayOfResult.Result[0].URI[0],
                        name: result.ArrayOfResult.Result[0].Label[0],
                        description: result.ArrayOfResult.Result[0].Description[0],
                      },
                      links: []
                    };
                  }
                  entities[entity_slug].links.push({
                    node: ''+ task.name,
                    region: _.extend(resource.region),
                    markers: _.extend(resource.markers)
                  });

                } else if(result && result.ArrayOfResult && !result.ArrayOfResult.Result) { // identifier not found on dbpedia
                  
                  var entity_slug = getSlug('' + resource.identification); // store other information as well
                  if(!entities[entity_slug]) {
                    entities[entity_slug] = {
                      properties: {
                        name: entity_slug
                      },
                      links: []
                    };
                  }
                  entities[entity_slug].links.push({
                    node: ''+ task.name,
                    region: _.extend(resource.region),
                    markers: _.extend(resource.markers)
                  });

                } else {
                  // collect errors, to be corrected later on
                  console.log('(!) ',result, 'when request ',  resource.identification);
                  throw 'not found';
                }
                setTimeout(dbcallback, 500);
              });
            }
          });
          //dbcallback();
        });
        
        dbpediaqueue.push(resources, function(){

        });

        dbpediaqueue.drain = function() {
          console.log('all items have been processed', resources);

          next(null, 'done');
        };
      }

    ], function (err, result) {
      // result now equals 'done'    
      console.log('ENDING waterfall step for ' + task.name, result);

     

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

  //console.log(entities);  
  for(var i in media) {
    var res_node = batch.save(media[i].properties);
    media[i].res_node = res_node;
  }

 
  for(var i in entities) {
    console.log(i, entities[i].links.length);
    var ent_node = batch.save(entities[i].properties),
        markdown = [];

    entities[i].ent_node = ent_node;

    for(var j in entities[i].links) {
      batch.relate(ent_node, 'appears_in', media[entities[i].links[j].node].res_node);
       // append entity property to a markdown object
      if(!media[entities[i].links[j].node].markdown)
        media[entities[i].links[j].node].markdown = [];

      media[entities[i].links[j].node].markdown.push(YAML.stringify({
          uri: entities[i].properties.uri,
          name: entities[i].properties.name,
          region: entities[i].links[j].region,
          markers: entities[i].links[j].markers,
      }, 2));
    }
  }

  // update with md comments
  for(var i in media) {
    var ver_node = batch.save({
      creation_date: 0,
      name: 'v of '+ i,
      markdown: media[i].markdown? '´´´\n\n' + media[i].markdown.join('\n---\n\n') + '\n\n´´´': ''
    });
    media[i].ver_node = ver_node;
    batch.relate(ver_node, 'describes', media[i].res_node, {upvote: 1, downvote: 0});
  };

  // label everything
  batch.label(_.map(media, function (d) { return d.res_node }), 'resource');
  batch.label(_.map(media, function (d) { return d.ver_node }), 'version');
  batch.label(_.map(entities, function (d) { return d.ent_node }), 'entity');

  // finally, commmit
  batch.commit(function (err, results) {
    if(err)
      console.log(err)
    else
      console.log('all items have been processed ans saved');
  })
    
}
