/**
  Picture resolver.
  This could be used as run sometimes script.
  It makes sure that all the images has been treated somehow.
*/
var settings  = require('../settings'),
    helpers   = require('../helpers'),
    YAML      = require('yamljs'),
    queries   = require('decypher')('./queries/migration.discover.cyp'),
    
    neo4j = require('seraph')(settings.neo4j.host),
    async = require('async'),
    _     = require('lodash');

var queue = async.waterfall([
    // get pictures and documents having a caption
    function (next) {
      neo4j.query('MATCH (n:`resource`) WHERE has(n.caption) AND not(has(n.alchemyapi_reconciliated)) RETURN n', function (err, nodes) {
        if(err)
          throw err;
        
        next(null, _.take(nodes, nodes.length))
      });
    },

    /**
      Nicely add alchemy api service to extract persons from resources having caption (an/or source field)
    */
    function (resources, next) {
      var q = async.queue(function (resource, nextResource) {
        var now = helpers.now();
        console.log('resource remaining', q.length())
        helpers.alchemyapi([
          resource.name || '',
          resource.source || '',
          resource.caption
        ].join('. '), 'TextGetRankedNamedEntities', function (err, entities) {
          if(err)
            throw err;
          console.log('  persons: ',_.map(entities, 'name'));
          
          var _q = async.queue(function (entity, nextEntity) {
            helpers.enrichResource(resource, entity, function(err, next) {
              if(err)
                throw err;
              nextEntity()
            });
          }, 2)
          _q.push(entities);
          _q.drain = nextResource;
        });

      }, 1);
      q.push(resources);
      q.drain = function() {
        console.log('ended')
      }
    },
    /**
      DEPRECATED: unable to read link properly
    */
    // function (next) {
    //   neo4j.query(queries.get_versions_annotated_with_people, function (err, nodes) {
    //     if(err)
    //       throw err;
    //     next(null, _.take(nodes, 1));
    //   });
    // },
    // function (triples, next) {
    //   var batch = neo4j.batch();
    //   var q = async.queue(function (triple, nextTriple) {
    //     var indentifications = YAML.parse(triple.ver.markdown);
    //     for(var i in triple.per) {
    //       var uri = triple.per[i].uri,
    //           marker = _.find(indentifications, {uri: uri});
    //       if(marker)
    //         // add link
    //       console.log(marker)
    //     }

       
    //   }, 1);
    //   q.push(triples);
    //   q.drain = function() {
    //     console.log('ended');
    //     batch.commit();
    //   }

    // },
    /**
      get the images not having been analysed
    */
    function (next) {
      neo4j.query(queries.get_pictures, function (err, nodes) {
        console.log(queries.get_pictures)
        if(err)
          throw err;
        
        next(null, _.take(nodes, 30))
      });
    },
    /**
      send the images to the animetric analyser
    */
    function (pictures, next) {
      var q = async.queue(function (picture, nextPicture) {
        var now = helpers.now(),
            filepath = settings.mediaPath + '/' + picture.url;

        console.log('animetric service on url:', picture.url, 'remaining', q.length());
        
        if(picture.animetrics_annotated !== undefined) {
          nextPicture();
          return;
        }
        // call animetrics service and gives back the result.
        helpers.animetrics(filepath, function (err, res) {
          console.log(err, res)
          if(err == helpers.IS_EMPTY) {
            console.log(' no faces found');
            picture.animetrics_annotated = false; // let'"s save the fact that we had used the service anyway"
            neo4j.save(picture, function (err, nodes) {
              if(err)
                throw err;
              nextPicture();
            })
            return;
          }

          if(err)
            throw err;
          console.log(' found', res.faces, 'faces');
          neo4j.query(queries.merge_version_from_service, {
            url: picture.url,
            service: 'animetrics',
            unknowns: res.faces.length,
            persons: res.faces.length,
            creation_date: now.date,
            creation_time: now.time,
            yaml: YAML.stringify(res.faces, 2)
          }, function (err, nodes) {
            if(err)
              throw err;
            console.log('  version saved, #id', nodes[0].id, 'url:', nodes[0].url);
            // // save
            neo4j.query(queries.merge_relationship_version_resource, {
              version_id: nodes[0].id,
              resource_id: picture.id
            }, function (err, nodes) {
              if(err)
                throw err;
              console.log('  rel saved, #ver_id', nodes[0].ver.id, 'res_url:', nodes[0].res.url);
              picture.animetrics_annotated = true;
              neo4j.save(picture, function (err, nodes) {
                if(err)
                  throw err;
                nextPicture();
              })
              
            })
          })
        })
      }, 1);
      q.push(pictures);
      q.drain = function() {
        next(null, pictures);
      };
    },

    /**
      send the images to the fool analyser: skybiometry.
    */
    // function (pictures, next) {
    //   // local queue, with throttle
    //   var q = async.queue(function (picture, nextPicture) {
    //     var now = helpers.now(),
    //         filepath = settings.mediaPath + '/' + picture.url;

    //     console.log('skybiometry service on url:', picture.url, 'remaining', q.length());
        
    //     helpers.skybiometry(filepath, function (err, res) {
    //       if(err)
    //         throw err;
    //       console.log(res);
    //       nextPicture()
    //     });
    //   }, 1);

    //   q.push(pictures);
    //   q.drain = function() {
    //     next(null, pictures); 
    //   }
    // },
    /**
      send the images to the fool analyser: rekognition.
    */
    function (pictures, next) {
      // local queue, with throttle
      var q = async.queue(function (picture, nextPicture) {
        var now = helpers.now(),
            filepath = settings.mediaPath + '/' + picture.url;

        if(picture.rekognition_annotated) {
          nextPicture();
          return;
        }
        console.log('rekognition service on url:', picture.url, 'remaining', q.length());
        //console.log(now);
        helpers.rekognition(filepath, function (err, res) {
          if(err)
            throw err;
          console.log('  face detections:', res.face_detection.length);
          // console.log(res);
          // this tranlsates rekognition mechanism to HG internal one
          var results = res.face_detection.map(function (d) {
            //console.log(d);
            var _d = {
              region: {
                left: d.boundingbox.tl.x,
                top: d.boundingbox.tl.y,
                right: d.boundingbox.tl.x + d.boundingbox.size.width,
                bottom: d.boundingbox.tl.y + d.boundingbox.size.height,
              },
              markers: [],
              emotion: d.emotion,
              pose: d.pose,
              glasses: d.glasses,
              emotion: d.emotion,
              sunglasses: d.sunglasses,
              confidence: d.confidence,
              identification: 'unknown'
            };

            if(d.eye_left)
              _d.markers.push({
                label: 'LeftEye',
                x: d.eye_left.x,
                y: d.eye_left.y
              });
            if(d.eye_right)
              _d.markers.push({
                label: 'RightEye',
                x: d.eye_right.x,
                y: d.eye_right.y
              });
            if(d.nose)
              _d.markers.push({
                label: 'Nose',
                x: d.nose.x,
                y: d.nose.y
              });
            if(d.mouth_l)
              _d.markers.push({
                label: 'MouthLeft',
                x: d.mouth_l.x,
                y: d.mouth_l.y
              });
            if(d.mouth_r)
              _d.markers.push({
                label: 'MouthRight',
                x: d.mouth_r.x,
                y: d.mouth_r.y
              });

            return _d
          });
          // trasnlate recongition to custom
          neo4j.query(queries.merge_version_from_service, {
            url: picture.url,
            service: 'rekognition',
            unknowns: results.length,
            persons: results.length,
            creation_date: now.date,
            creation_time: now.time,
            yaml: YAML.stringify(results, 2)
          }, function (err, nodes) {
            if(err)
              throw err;
            console.log('  version saved, #id', nodes[0].id, 'url:', nodes[0].url);
            // // save
            neo4j.query(queries.merge_relationship_version_resource, {
              version_id: nodes[0].id,
              resource_id: picture.id
            }, function (err, nodes) {
              if(err)
                throw err;
              console.log('  rel saved, #ver_id', nodes[0].ver.id, 'res_url:', nodes[0].res.url);
              picture.rekognition_annotated = true;
              neo4j.save(picture, function (err, nodes) {
                if(err)
                  throw err;
                nextPicture();
              })
              
            })
            //merge_version_from_service()
            // create a version
            // merge its relationship to the relative resource url
            
          });
        })
      }, 1);

      q.push(pictures);
      q.drain = next;
    }
  ], function (err, result) {
    // result now equals 'done'    
    console.log('finished');
  });
