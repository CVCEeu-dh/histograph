/*
  Enrich neo4j item labelled resource with metadata.
  Algorithm:
  
  - merge all person found in the entitites file, e.g
    "persons":[
      {
         "picture":{
            "image":"http://upload.wikimedia.org/wikipedia/commons/c/c4/Stalin_1945.jpg",
            "source":"Wikimedia"
         },
         "name":"Joseph Stalin",
         "id":"8000554",
         "links":{
            "viaf":"101787139",
            "worldcat":"lccn-n80044789",
            "wiki":"Joseph_Stalin"
         }
      },
  -

*/
var fs = require('fs'),
    path = require('path'),
    settings = require('./settings'), // note: migration specific settings to already existing HG
    
    helpers  = require('../helpers'),
    request  = require('request'),
    async    = require('async'),
    xml      = require('xml2js'),
    flatten  = require('flat'),
    YAML     = require('yamljs'),
    _        = require('lodash'),

    queries = require('decypher')('./queries/migration.resolve.cyp'),

    neo4j    = require('seraph')(settings.neo4j.host),

    batch = neo4j.batch();

var translations = [],  // translation table from old reference to new ones
    ics = [],
    lacking_ics = [], // discordances between the xml file and the ic files
    lacking_references = [],  //here references not appearing in translation will be put
    lacking_people = {},
    geonames = {},
    geocoding = {}

async.waterfall([
  /**
    Create entity:person node from each pêrson fond in the person json file
    specified by settings.metadataPath.persons
  */
  function(next) {
    if(settings.ignorePersons) {
      next(null)
      return;
    }
    var persons = require(settings.metadataPath.persons).persons,
        queue;
        console.log(persons.length)
    //throw 'stop'
    queue = async.queue(function (person, callback) {
      var person = _.assign({
        picture: {
          image: '',
          source: '',
        },
        links:{
          viaf: '',
          worldcat: '',
          wiki: ''
        }
      }, person);

      console.log('remaining', queue.length());

      neo4j.query(queries.merge_person_entity, flatten(person, {delimiter: '_'}),
        function(err, node) {
          if(err)
            throw err;
            //console.log(err);
          callback();
        });
    }, 15);

    queue.push(_.take(persons, persons.length), function (err) { // _.take(persons, 0)
      if(err)
        throw err
    });

    queue.drain = function() {
      console.log('all persons have been processed');
      next(null);
    }
  },

  // load fields in json
  function(next) {
    var contents = fs.readFileSync(settings.metadataPath.resources);
    translations = require(settings.metadataPath.translations).picture;
    ics = fs.readdirSync(settings.ICSPath).filter(function (d) {
      return !!~d.indexOf('.ic');
    }).map(function (d) {
      return path.basename(d, '.ic') + '.jpg';
    });
   
    xml.parseString(contents, {explicitArray: false}, function (err, result) {
      var merged = result.photos.item.map(function (d){
        var url = _.find(translations, _.matchesProperty('oldReference', ('0000000' + d.id).slice(-5) + '.jpg'));
        if(!url) {
          d.url = d.jpg; 
          lacking_references.push(d);
        } else {
          d.url = url.newReference;
        }
        d.reference = d.id; // old reference, for test purposes.
        return d;
      });
      // add orphelins picture URLs, since they're not in the xml list ... !
      var orphelins = _.difference(ics, merged.map(function (d) {
        return d.url
      }));

      if(orphelins.length > 0) 
        throw 'there are ' + orphelins.length + 'ics files not included into the merged map, exiting';
      //console.log(orphelins.length)
      next(null, merged);
    });
  },


  /**
    For each picture, do the reconciliation job.
    Add all ics files not found in the translation table to take part into the integration process.
  */
  function(pictures, next) {
    // date should be in ISO format, cfr. http://www.w3.org/TR/NOTE-datetime
    // create a queue object with concurrency 2
    var q = async.queue(function (picture, callback) {
      // for each picture
      var reconciliation = async.waterfall([
        /**
          Create a node:resource (unique key: url)
        */
        function(nextReconciliation) {
          neo4j.query(queries.merge_resource, {
            url: picture.url,
            reference: picture.reference,
            date: picture.date,
            title: picture.title,
            place: picture.place,
            stakeholders: picture.stakeholders
          }, function (err, node) {
            if(err) {
              console.log('error saving picture picture', picture);
              throw(err);
            }
            nextReconciliation(null, node[0])
          });
        },
        /*
          Create a node:version for the node:resource,
          that will be able to host entities 'fingerprint' on the resouce.
          Nextstep: reconcile geonames.
          @param n - the picture node just created
        */
        function(n, nextReconciliation) {
          neo4j.query(queries.merge_version, {
            url: n.url,
          }, function (err, nodes) {
            if(err) {
              console.log(err);
              throw(err);
            } else {
              neo4j.query(queries.merge_relationship_version_resource, {
                resource_id: n.id,
                version_id: nodes[0].id
              }, function (err, results) {
                if(err)
                  throw err;
                //console.log(results);
                nextReconciliation(null, n, nodes[0]);
              });  
            }
          });
        },
        /*
          Reconcile with geonames, 1/2: call geonames service for city names.
          Nextstep: save result as entity.
          @param n - the picture node
          @param v - the version node just created
        */
        function(n, v, nextReconciliation) {
          if(!settings.geonames.reconcile || n.place.length < 3) {
            nextReconciliation(null, n, v);
            return;
          }
          if(geonames[n.place]) {
            console.log('loading cached geonames results for', n.place);
            helpers.enrichResource(n, geonames[n.place], function (err, nodes) {
              if (err)
                throw err;
              nextReconciliation(null, n, v);
            });
            return;
          }

          helpers.geonames(n.place, function(err, nodes) {
            if(err == helpers.IS_EMPTY) {
              neo4j.query(queries.merge_automatic_inquiries,{
                service: 'geonames',
                content: 'Reconciliation: fill #place with lat/lon for **' + n.place + '**'
              }, function(err, nodes) {
                if(err)
                  throw err;

                //batch.relate(nodes[0], 'questions', v, {upvote: 1, downvote:0});
                nextReconciliation(null, n, v);
              });
              return;
            }

            if (err)
              throw err;

            geonames[n.place] = nodes[0];
            //console.log('place', n.place, 'reconciled to', nodes[0], ',', nodes[0].geocode_countryName);
            
            helpers.enrichResource(n, nodes[0], function (err, nodes) {
              if (err)
                throw err;
              nextReconciliation(null, n, v);
            });
          });   
        },
        /*
          Reconcile with geocodes, call geocode api service for addresses and city names.
          Nextstep: save result as entity.
          @param n - the picture node
          @param v - the version node just created
        */
        function(n, v, nextReconciliation) {
          if(!settings.geocoding.reconcile || n.place.length < 3) {
            nextReconciliation(null, n, v);
            return;
          }
          if(geocoding[n.place]) {
            console.log('loading cached geocoding results for', n.place);
            helpers.enrichResource(n, geocoding[n.place], function (err, nodes) {
              if (err)
                throw err;
              nextReconciliation(null, n, v);
            });
            return;
          }
          console.log('geocoding results for', n.place);
            
          helpers.geocoding(n.place, function(err, nodes) {
            if(err == helpers.IS_EMPTY) {
              neo4j.query(queries.merge_automatic_inquiries,{
                service: 'geocoding',
                content: 'Reconciliation geocoding: fill #place with lat/lon for **' + n.place + '**'
              }, function(err, nodes) {
                if(err)
                  throw err;

                //batch.relate(nodes[0], 'questions', v, {upvote: 1, downvote:0});
                nextReconciliation(null, n, v);
              });
              return;
            }

            if (err)
              throw err;

            geocoding[n.place] = nodes[0];
            //console.log('place', n.place, 'reconciled to', nodes[0], ',', nodes[0].geocode_countryName);
            
            helpers.enrichResource(n, nodes[0], function (err, nodes) {
              if (err)
                throw err;
              nextReconciliation(null, n, v);
            });
          });   
        },
        /*
          Migrate IC file from dataset folder.
          @param n - the picture node
          @param v - the version node
        */
        function (n, v, nextReconciliation) {
          var icFile = path.resolve(settings.ICSPath, path.parse(n.url).name + '.ic');
          
          if(settings.ignoreICS || !fs.existsSync(icFile)) {
            //console.log('file not found', icFile )
            nextReconciliation(null, n,v, null);
            return;
          }
          
          var contents = fs.readFileSync(icFile);
          xml.parseString(contents, {explicitArray: false}, function (err, result) {
            var image = result.image_content.image;
            n.mimetype = 'image';
            n.width = image.width;
            n.height = image.height;
            if(image.attributes.attribute)
              for(var i in image.attributes.attribute)
                n[image.attributes.attribute[i].key] = image.attributes.attribute[i].value;
            n.height = image.height;
            n.height = image.height;

            neo4j.save(n, function(err, node) {
              if(err)
                throw err;
              nextReconciliation(null, node, v, result.image_content.objects);
            })
          });
          
        },
         /*
          Add links between entity:person and current node.
          Add marked information in the corresponding version node.
          @param n - the picture node
          @param v - the version node
          @param items - entity:Person node candidate.
        */
        function (n, v, items, nextReconciliation) {
          if(!items || !items.object) {
            nextReconciliation(null, n, v);
            return;
          }
          var entities = [],
              unknowns = 0, // unknowns entities...
              relationships; // extract entities in resource
          if(items.object.length) {
            for(var i in items.object) {
              var entity = {};
              entity.region  = items.object[i].region;
              if(items.object[i].markers)
                entity.markers  = items.object[i].markers;
              if(items.object[i].identification) {
                entity.identification  = items.object[i].identification._;
                entity.uri  = items.object[i].identification.$.id;
                if(!entity.uri || entity.uri == '')
                  if(entity.identification && entity.identification != 'unknown') {
                    console.log('----',entity.identification, items.object[i].identification)
                    throw entity.identification
                  }
                // if(!entity.uri || entity.uri == '')// && entity.identification && entity.identification.length > 2 && entity.identification != 'unknown')
                //   console.log('----',entity.identification, items.object[i].identification)
              }

              
              entities.push(entity);
            };
          } else {
            var entity = {
              region: items.object.region
            };

            if(items.object.markers)
              entity.markers  = items.object.markers;
            
            if(items.object.identification) {
              entity.identification  = items.object.identification._;
              entity.uri  = items.object.identification.$.id;
              if(!entity.uri || entity.uri == '')
                if(entity.identification && entity.identification != 'unknown') {
                  console.log('----',entity.identification, items.object.identification)
                  throw entity.identification
                }
            }
            entities.push(entity);
          };
          
          relationships = async.queue(function (entity, nextRelationship) {
            if(!entity.uri || entity.uri == '') {
              unknowns++;
              if(!lacking_people[''+entity.identification])
                lacking_people[''+entity.identification] = [];
              lacking_people['' + entity.identification].push(n.url);
              nextRelationship();
              return 
            }
            console.log('connecting identification URI',entity.uri, 'with', n.url);

            neo4j.query(queries.merge_relationship_entity_resource_by_uri,
              {
                uri: entity.uri,
                url: n.url
              }, function(err, rels) {
                if(err)
                  throw (err);
                nextRelationship()
              }
            );
          }, 4);
          
          relationships.push(entities, function(){

          });

          relationships.drain = function() {
            // add markdown info on resource.
            v.unknowns = unknowns;
            v.markdown = YAML.stringify(entities, 2);
            neo4j.save(v, function(err, node) {
              if(err)
                throw err;
              nextReconciliation(null, n, v);
            })
          }
        },
        /*
          Reconcile date with ISO standard for time windows
          @param n - the picture node
          @param v - the version node
        */
        function (n, v, nextReconciliation) {
          if(n.date.length < 4) {
            nextReconciliation();
            return;
          }

          helpers.reconcileHumanDate(n.date, 'fr', function(err, dates) {
            if(err) {
              console.log(n)
              throw err;
            }
            // Invalid DAtes
            if(isNaN(dates.start_time) || isNaN(dates.end_time)) {
              console.log('invadild Date', n, dates);
              neo4j.query(queries.merge_automatic_inquiries,{
                service: 'humanDate',
                content: 'Reconciliation: fill #date with a correct time span for **' + n.date + '**'
              }, function(err, nodes) {
                if(err) {
                  console.log(n);
                  throw err;
                }
                //batch.relate(nodes[0], 'questions', v, {upvote: 1, downvote:0});
                nextReconciliation();
              });
            } else {
              n = _.assign(n, dates);
              neo4j.save(n, function(err, node) {
                if(err) {
                  console.log(n);
                  throw err;
                }
                  
                nextReconciliation();
              })
            };
              
            
          });
        }
      ], callback);
    }, 1);

    q.push(_.take(pictures, pictures.length), function (err) {if(err)console.log(err)}); // pictures 

    // assign a callback
    q.drain = function(err) {
      console.log('all items have been processed');

      fs.writeFileSync('./lacking_references.log', JSON.stringify(lacking_references, null, 2));
      fs.writeFileSync('./lacking_people.log', JSON.stringify(lacking_people, null, 2));
      
      //console.log('people',lacking_people);
      next(null);
    };
  },


  

], function (err, result) {
    // result now equals 'done'    
    console.log('finished');
});

     
