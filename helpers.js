/**
  A bunch of useful functions
*/
var fs       = require('fs')
    crypto   = require('crypto'),
    settings = require('./settings'),
    request  = require('request'),
    _        = require('lodash'),
    moment   = require('moment'),

    IS_EMPTY = 'is_empty',
    IS_IOERROR  = 'IOError',

    reconcile  = require('decypher')('./queries/migration.resolve.cyp'),
    neo4j      = require('seraph')(settings.neo4j.host);

module.exports = {
  IS_EMPTY: IS_EMPTY,
  IS_IOERROR: IS_IOERROR,
  /**
    Handle causes and stacktraces provided by seraph
    @err the err string provided by cypher
    @res the express response object
  */
  cypherError: function(err, res) {
    if(err && err.message) {
        var result = JSON.parse(err.message);

        if(result.cause)
          return res.error(400, result.cause);

        return res.error(500, result);
    }
    return res.error(400, err.message);
  },
  /**
    Handle causes and stacktraces provided by seraph Query and rawQuery.
    @err the err OBJECT provided by cypher
    @res the express response object
  */
  cypherQueryError: function(err, res) {
    // for(i in err)
    //   console.log(i)
    // console.log('@helpers.cypherQueryError', err.neo4jException, err.statusCode, err.neo4jCause)
    switch(err.neo4jException) {
      case 'EntityNotFoundException':
        return res.error(404, {
          message:  err.neo4jCause.message,
          exception: err.neo4jException
        });
      default:
        return res.error(err.statusCode, err);
    };
  },


  /**
    encrypt a password ccording to local settings secret and a random salt.
  */
  encrypt: function(password, options) {
    var configs = _.assign({
          secret: '',
          salt: crypto.randomBytes(16).toString('hex'),
          iterations: 4096,
          length: 256,
          digest: 'sha256'
        }, options || {});
    //console.log(configs)
    return {
      salt: configs.salt,
      key: crypto.pbkdf2Sync(
        configs.secret,
        configs.salt + '::' + password,
        configs.iterations,
        configs.length,
        configs.digest
      ).toString('hex')
    };
  },

  comparePassword:  function(password, encrypted, options) {
    return this.encrypt(password, options).key == encrypted;
  },

  /**
    Call dbpedia service and translate its xml to a more human json content
  */
  dbpedia: function(fullname, next) {
    request.get('http://lookup.dbpedia.org/api/search.asmx/PrefixSearch?QueryClass=person&MaxHits=5&QueryString='
      + encodeURIComponent(fullname),
      function (err, res, body) {
        if(err) {
          next(err);
          return;
        }

        xml.parseString(body, function(err, result) {
          if(err) {
            next(err); // this should never happen /D
            return;
          }

          if(!result || !result.ArrayOfResult || !result.ArrayOfResult.Result) {
            next(IS_EMPTY);
            return;
          }
          next(null, result.ArrayOfResult.Result);
        });
      }
    );
  },

  /**
    Create a Viaf entity:person node for you
   */
  viaf: function(fullname, next) {
    var viafURL = 'http://www.viaf.org/viaf/AutoSuggest?query='
        + encodeURIComponent(fullname);

    request.get({
      url: viafURL,
      json:true
    }, function (err, res, body) {
      if(err) {
        next(err);
        return;
      }

      //console.log(body);
      next(IS_EMPTY);
      // neo4j.query(reconcile.merge_geonames_entity, _.assign({
      //     q: geonamesURL,
      //     countryId: '',
      //     countryCode: ''
      //   }, body.geonames[0]),
      //   function(err, nodes) {
      //     if(err) {
      //       next(err);
      //       return;
      //     }
      //     next(null, nodes);
      //   }
      // );
    });
  },


  /**
    Create a Geocoded entity:location Neo4j node for you. The Neo4J MERGE result will be
    returned as arg for the next function next(null, result)
    
    Call the geocode api according to your current settings: make sure you use the proper
    
      settings.geocoding.key

    Handle err response; it creates nodes frm the very first address found.
    @next your callback with(err, res)
  */
  geonames: function(address, next) {
    var geonamesURL = 'http://api.geonames.org/searchJSON?q='
        + encodeURIComponent(address)
        + '&style=long&maxRows=10&username=' + settings.geonames.username;

    request.get({
      url: geonamesURL,
      json:true
    }, function (err, res, body) {
      if(err) {
        next(err);
        return;
      }

      if(!body.geonames || !body.geonames.length) {
        next(IS_EMPTY);
        return;
      };
      console.log(body.geonames[0].toponymName, body.geonames[0].countryName, 'for', address);
      neo4j.query(reconcile.merge_geonames_entity, _.assign({
          geonames_id: body.geonames[0].geonameId,
          q: geonamesURL,
          countryId: '',
          countryCode: ''
        }, body.geonames[0]),
        function(err, nodes) {
          if(err) {
            next(err);
            return;
          }
          next(null, nodes);
        }
      );
    });
  },

  /**
    Create a Geocoded entity:location Neo4j node for you. The Neo4J MERGE result will be
    returned as arg for the next function next(null, result)
    
    Call the geocode api according to your current settings: make sure you use the proper
    
      settings.geocoding.key

    Handle err response; it creates nodes frm the very first address found.
    @next your callback with(err, res)
  */
  geocoding: function(address, next) {
    request.get({
      url: 'https://maps.googleapis.com/maps/api/geocode/json?key='
          + settings.geocoding.key
          + '&address=' + encodeURIComponent(address),
      json: true
    }, function (err, res, body) {
      if(err) {
        next(err);
        return;
      }
      
      if(!body.results.length) {
        next(IS_EMPTY);
        return;
      };
      //console.log(body.results[0].formatted_address, 'for', address);
      //console.log(body.results[0].address_components)

      var country = _.find(body.results[0].address_components, function (d){
          return d.types[0] == 'country';
        }),
        locality =  _.find(body.results[0].address_components, function (d){
          return d.types[0] == 'locality';
        });
      
      // update the nodee
      neo4j.query(reconcile.merge_geocoding_entity, {
        geocode_id: body.results[0].place_id,

        q: 'https://maps.googleapis.com/maps/api/geocode/json?address=' + encodeURIComponent(address),
        
        countryName: country? country.long_name: '',

        countryId: country? country.short_name: '',

        toponymName: locality? locality.long_name: '',

        formatted_address : body.results[0].formatted_address,

        lat: body.results[0].geometry.location.lat,
        lng: body.results[0].geometry.location.lng,

        ne_lat: body.results[0].geometry.viewport.northeast.lat,
        ne_lng: body.results[0].geometry.viewport.northeast.lng,
        sw_lat: body.results[0].geometry.viewport.southwest.lat,
        sw_lng: body.results[0].geometry.viewport.southwest.lng,
      }, function(err, nodes) {
        if(err) {
          next(err);
          return;
        };
        //console.log('COCOCOC', nodes)
        next(null, nodes);
        //batch.relate(n, 'helds_in', nodes[0], {upvote: 1, downvote:0});
        //nextReconciliation(null, n, v);
      });
    }); // end of get geocode
  },

  /**
    Create a relationship @relationship from two nodes resource and entity.
    The Neo4J MERGE result will be returned as arg for the next function next(null, result)
    @resource - Neo4J node:resource as js object
    @entity   - Neo4J node:entity as js object
    @next     - your callback with(err, res)
  */
  enrichResource: function(resource, entity, next) {
    neo4j.query(reconcile.merge_relationship_entity_resource, {
      entity_id: entity.id,
      resource_id: resource.id,
      }, function (err, relationships) {
        if(err) {
          next(err)
          return
        }
        next(null, relationships);
    });
  },

  /*
    Return this moment ISO timestamp and this moment EPOCH ms timestamp
  */
  now: function() {
    var now = moment.utc(),
        result = {};
    
    result.date = now.format();
    result.time = +now.format('X');
    return result;
  },

  /**
    Dummy Time transformation with moment.
  */
  reconcileHumanDate: function(humanDate, lang, next) {
    var date = humanDate.match(/(\d*)[\sert\-]*(\d*)\s*([^\s]*)\s?(\d{4})/),
        start_date,
        end_date,
        result = {};

    moment.locale(lang);
    var monthName = moment().month(0).format('MMMM');
    
    if(!date) {
      // check other patterns
      var candidate = humanDate.match(/(\d{2,4})?[^\d](\d{2,4})/);
      if(!candidate) {
        next(IS_EMPTY);
        return;
      }
      if(candidate[1].length && candidate[2].length) {
        start_date = moment.utc([1, monthName, candidate[1].length < 4? '19' + candidate[1]:candidate[1]].join(' '), 'LL');
        end_date = moment.utc([1, monthName, candidate[2].length < 4? '19' + candidate[2]:candidate[2]].join(' '), 'LL');
        end_date = moment(end_date).add(1, 'year').subtract(1, 'minutes');
      } else {
        start_date = moment.utc([1, monthName, candidate[2].length < 4? '19' + candidate[2]:candidate[2]].join(' '), 'LL');
        end_date = moment(start_date).add(1, 'year').subtract(1, 'minutes');
      }

      
    } else {
      if(!date[1].length && date[3].length && ['années'].indexOf(date[3].toLowerCase()) !== -1) {
        start_date = moment.utc([1, monthName, date[4]].join(' '), 'LL');
        end_date   = moment(start_date).add(10, 'year').subtract(1, 'minutes');
      } else if(!date[1].length && (!date[3].length || ['vers'].indexOf(date[3].toLowerCase()) !== -1) ) {
        start_date = moment.utc([1, monthName, date[4]].join(' '), 'LL');
        end_date   = moment(start_date).add(1, 'year').subtract(1, 'minutes');
      } else if(!date[1].length) {
        start_date = moment.utc([1,date[3], date[4]].join(' '), 'LL');
        end_date   = moment(start_date).add(1, 'month').subtract(1, 'minutes');
      } else {
        start_date = moment.utc([date[1],date[3], date[4]].join(' '), 'LL');
        if(date[2].length)
          end_date = moment.utc([date[2],date[3], date[4]].join(' '), 'LL')
            .add(24, 'hours')
            .subtract(1, 'minutes');
        else
          end_date = moment(start_date)
            .add(24, 'hours')
            .subtract(1, 'minutes');
      }
    }
    result.start_date = start_date.format();
    result.start_time = +start_date.format('X');
    result.end_date = end_date.format();
    result.end_time = +end_date.format('X');

    next(null, result);
  },

  /**
    Send a picture to the rekognition service
  */
  rekognition: function(filepath, next) {
    fs.readFile(filepath, function (err, img) {
      if(err) {
        next(IS_IOERROR)
        return;
      }
      //console.log('image', filepath)
      var encoded_image = img.toString('base64');
      request
        .post({
          url: 'http://rekognition.com/func/api/',
          json: true,
          form: { 
            api_key: settings.rekognition.API_KEY,
            api_secret: settings.rekognition.API_SECRET,
            jobs: 'face_part_detail_recognize_emotion_beauty_gender_emotion_race_eye_smile_mouth_age_aggressive',
            base64: encoded_image,
            name_space: settings.rekognition.NAME_SPACE,
            user_id: settings.rekognition.USER_ID
          }
        }, function (err, res){
          if(err) {
            next(err)
            return;
          }
          next(null, res.body)
        });
    }); // eof readFile
  },

  /**
    Send a picture to the skybiometry face detection service
  */
  skybiometry: function(filepath, next) {
    var form = { 
          api_key:  settings.skybiometry.API_KEY,
          api_secret:  settings.skybiometry.API_SECRET,
          attributes: 'all',
          detect_all_feature_points:  'true',
          files: fs.createReadStream(filepath)
        };

    var req = request
      .post({
        url: 'http://api.skybiometry.com/fc/faces/detect',
        json: true,
        formData: form
      }, function (err, res, req){
        if(err) {
          next(err)
          return;
        }
        next(null, res.body)
      });
    //console.log(req)
  },

  /**
    Send a picture to animetrics.com face detection service.
    remap the results to the common "face" tamplating for version
  */
  animetrics: function(filepath, next) {
    var form = { 
          api_key:  settings.animetrics.API_KEY,
          selector:  'FULL',
          image: fs.createReadStream(filepath)
        };

    var req = request
      .post({
        url: settings.animetrics.endpoint.detect,
        json: true,
        formData: form
      }, function (err, res, req){
        if(err) {
          next(err)
          return;
        }
        if(res.body.errors) {
          next(res.body.errors)
          return;
        }
        console.log(res.body)
        if(!res.body.images || !res.body.images.length || !res.body.images[0].faces.length) {
          next(IS_EMPTY);
          return;
        };
        // remap!
        var image = res.body.images[0];

        image.faces = image.faces.map(function (d) {
          /** original face information
          { 
            topLeftX: 127,
            topLeftY: 78,
            width: 132,
            height: 132,
            leftEyeCenterX: 166.05,
            leftEyeCenterY: 130.25,
            rightEyeCenterX: 208.95,
            rightEyeCenterY: 129.7,
            noseTipX: 188.39376294388,
            noseTipY: 156.96469773918,
            noseBtwEyesX: 189.20319427534,
            noseBtwEyesY: 123.70034364528,
            chinTipX: 193.84846382534,
            chinTipY: 216.86817213518,
            leftEyeCornerLeftX: 159.35546875,
            leftEyeCornerLeftY: 131.00625,
            leftEyeCornerRightX: 176.78359375,
            leftEyeCornerRightY: 130.7828125,
            rightEyeCornerLeftX: 198.9125,
            rightEyeCornerLeftY: 131.16953125,
            rightEyeCornerRightX: 215.66171875,
            rightEyeCornerRightY: 130.284375,
            rightEarTragusX: 227.25349991883,
            rightEarTragusY: 139.43476047441,
            leftEarTragusX: -1,
            leftEarTragusY: -1,
            leftEyeBrowLeftX: 151.39518911442,
            leftEyeBrowLeftY: 124.26248076483,
            leftEyeBrowMiddleX: 165.65862043483,
            leftEyeBrowMiddleY: 118.83435907659,
            leftEyeBrowRightX: 179.35741777102,
            leftEyeBrowRightY: 119.28268882919,
            rightEyeBrowLeftX: 200.22669884463,
            rightEyeBrowLeftY: 119.62440636946,
            rightEyeBrowMiddleX: 211.94083364907,
            rightEyeBrowMiddleY: 118.14622570612,
            rightEyeBrowRightX: 223.75188864653,
            rightEyeBrowRightY: 123.18666662225,
            nostrilLeftHoleBottomX: 181.30081536088,
            nostrilLeftHoleBottomY: 162.28620721508,
            nostrilRightHoleBottomX: 196.94550715161,
            nostrilRightHoleBottomY: 162.05359875182,
            nostrilLeftSideX: 174.71434964629,
            nostrilLeftSideY: 157.82009230248,
            nostrilRightSideX: 201.45039014142,
            nostrilRightSideY: 158.07458166902,
            lipCornerLeftX: -1,
            lipCornerLeftY: -1,
            lipLineMiddleX: -1,
            lipLineMiddleY: -1,
            lipCornerRightX: -1,
            lipCornerRightY: -1,
            pitch: -0.69633820470046,
            yaw: -12.586200046938,
            roll: -0.90004336228229,
            attributes: { gender: { time: 0.05935, type: 'F', confidence: '80%' } } }
          
          */
          var _d = {
            region: {
              left:   d.topLeftX,
              top:    d.topLeftY,
              right:  d.topLeftX + d.width,
              bottom: d.topLeftY + d.height,
            },
            markers: [],
            pose: {
              pitch: d.pitch,
              yaw: d.yaw,
              roll: d.roll
            },
          };
          if(d.leftEyeCenterX)
            _d.markers.push({
              label: 'LeftEye',
              x: d.leftEyeCenterX,
              y: d.leftEyeCenterY
            });
          if(d.rightEyeCenterX)
            _d.markers.push({
              label: 'RightEye',
              x: d.rightEyeCenterX,
              y: d.rightEyeCenterX
            });
          if(d.noseTipX)
            _d.markers.push({
              label: 'Nose',
              x: d.noseTipX,
              y: d.noseTipY
            });
          if(d.lipCornerLeftX)
            _d.markers.push({
              label: 'MouthLeft',
              x: d.lipCornerLeftX,
              y: d.lipCornerLeftY
            });
          if(d.lipCornerRightX)
            _d.markers.push({
              label: 'MouthRight',
              x: d.lipCornerRightX,
              y: d.lipCornerRightY
            });

          return _d;
        })
        next(null, image)
      });
    //console.log(req)
  },
  
}
      