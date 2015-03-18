/*
  Enrich neo4j item labelled resource with metadata.
  Basically MERGE existing nodes
*/
var fs = require('fs'),
    path = require('path'),
    settings = require('./settings'),
    moment   = require('moment'),
    request  = require('request'),
    async    = require('async'),
    xml      = require('xml2js'),
    flatten  = require('flat'),
    _        = require('lodash'),
    neo4j    = require('seraph')(settings.neo4j.host),

    batch = neo4j.batch();

var translations = []; // translation table from old reference to new ones


moment.locale('fr', {
  months: 'janvier_février_mars_avril_mai_juin_juillet_août_septembre_octobre_novembre_décembre'.split('_'),
  monthsShort: 'janv._févr._mars_avr._mai_juin_juil._août_sept._oct._nov._déc.'.split('_'),
  weekdays: 'dimanche_lundi_mardi_mercredi_jeudi_vendredi_samedi'.split('_'),
  weekdaysShort: 'dim._lun._mar._mer._jeu._ven._sam.'.split('_'),
  weekdaysMin: 'Di_Lu_Ma_Me_Je_Ve_Sa'.split('_'),
  longDateFormat: {
    LT: 'HH:mm',
    L: 'DD/MM/YYYY',
    LL: 'D MMMM YYYY',
    LLL: 'D MMMM YYYY LT',
    LLLL: 'dddd D MMMM YYYY LT'
  },
  calendar: {
    sameDay: '[Aujourdhui à] LT',
    nextDay: '[Demain à] LT',
    nextWeek: 'dddd [à] LT',
    lastDay: '[Hier à] LT',
    lastWeek: 'dddd [dernier à] LT',
    sameElse: 'L'
  },
  relativeTime: {
    future: 'dans %s',
    past: 'il y a %s',
    s: 'quelques secondes',
    m: 'une minute',
    mm: '%d minutes',
    h: 'une heure',
    hh: '%d heures',
    d: 'un jour',
    dd: '%d jours',
    M: 'un mois',
    MM: '%d mois',
    y: 'une année',
    yy: '%d années'
  },
  ordinal: function (number) {
    return number + (number === 1 ? 'er' : 'ème');
  },
  week: {
    dow: 1, // Monday is the first day of the week.
    doy: 4 // The week that contains Jan 4th is the first week of the year.
  }
});
 
moment.locale("fr")




async.waterfall([
  // load entities
  function(next) {
    var persons = require(settings.metadataPath.persons).persons,
        queue;

    queue = async.queue(function (person, callback) {
      console.log(flatten(person, {delimiter: '_'}));

      neo4j.query(
          'MERGE (k:entity:person { uri:{id} })'
        + ' ON CREATE SET '
        + '  k.name = {name}, '
        + (person.picture? '  k.picture = {picture_image},': '')
        + (person.picture? '  k.picture_source = {picture_source}, ' : '')
        + '  k.links_viaf = {links_viaf}, '
        + '  k.links_worldcat = {links_worldcat}, '
        + '  k.links_wiki = {links_wiki}'
        + ' ON MATCH SET'
        + '  k.name = {name}, '
        + (person.picture? '  k.picture = {picture_image},': '')
        + (person.picture? '  k.picture_source = {picture_source}, ' : '')
        + '  k.links_viaf = {links_viaf}, '
        + '  k.links_worldcat = {links_worldcat}, '
        + '  k.links_wiki = {links_wiki}'
        + '  RETURN k',
        flatten(person, {delimiter: '_'}),
        function(err, node) {
          if(err)
            console.log(err);
          callback();
        });
    }, 15);

    queue.push(persons.slice(0,1), function (err) {if(err)console.log(err)});
    queue.drain = function() {
      console.log('all persons have been processed');
      next(null);
    }
  },

  // load fields in json
  function(next) {
    var contents = fs.readFileSync(settings.metadataPath.resources);
    translations = require(settings.metadataPath.translations).picture;

   
    xml.parseString(contents, {explicitArray: false}, function (err, result) {
      next(null, result.photos.item);
    });
  },



  function(pictures, next) {
    // date should be in ISO format, cfr. http://www.w3.org/TR/NOTE-datetime
    // create a queue object with concurrency 2
    var q = async.queue(function (picture, callback) {
      var reference = _.find(translations, _.matchesProperty('oldReference', ('000000'+picture.id).slice(-5) + '.jpg'));
      if(!reference)
        console.log('no old-new reference, please check', picture, ('000000'+picture.id).slice(-5) + '.jpg')
      // the chain for reconciliation
      var reconciliation = async.waterfall([
        // store resource in neo4j
        function(nextReconciliation) {
          neo4j.query(
              'MERGE (k:resource { url:{url} })'
            + ' ON CREATE SET '
            + '  k.date = {date}, '
            + '  k.title = {title}, '
            + '  k.place = {place}, '
            + '  k.stakeholders = {stakeholders} '
            + ' ON MATCH SET'
            + '  k.date = {date}, '
            + '  k.title = {title}, '
            + '  k.place = {place}, '
            + '  k.stakeholders = {stakeholders} '
            + 'RETURN k',
            {
              url: reference? reference.newReference: picture.id,
              date: picture.date,
              title: picture.title,
              place: picture.place,
              stakeholders: picture.stakeholders
            },function(err, node) {
              if(err) {
                console.log('error saving picture picture', picture);
                throw(err);
              } else
                nextReconciliation(null, node[0])
            });
        },
        /*
          Create a basic version for the entity, that will be able to link entities.
          Nextstep: reconcile geonames.
          @param n - the picture node just created
        */
        function(n, nextReconciliation) {
          neo4j.query(
              'MERGE (k:version { url:{url}, first: true })'
            + ' ON CREATE SET '
            + '  k.creation_date = timestamp() '
            + 'RETURN k',
            {
              url: n.url,
            }, function(err, nodes) {
              if(err) {
                console.log(err);
                throw(err);
              } else {
                // merge relationship instead.
                batch.relate(nodes[0], 'describes', n, {upvote: 1, downvote:0});
                nextReconciliation(null, n, nodes[0]);
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
          var geonamesURL = 'http://api.geonames.org/searchJSON?q='
              + encodeURIComponent(n.place)
              + '&style=long&maxRows=10&username=' + settings.geonames.username;
          if(settings.geonames.reconcile && n.place.length > 2)
            request.get({
              url: geonamesURL,
              json:true
            }, function (err, res, body) {
              if(err)
                throw err;
              if(!body.geonames ||  !body.geonames.length) {
                // strange place, maybe inquiry upon it...
                neo4j.query(
                    'MERGE (k:inquiry { strategy:{strategy}, content:{content} })'
                  + ' ON CREATE SET '
                  + '  k.content={content}'
                  + ' ON MATCH SET'
                  + '  k.content={content}'
                  + 'RETURN k', {
                    strategy: 'reconciliation',
                    content: 'Reconciliation: fill #place with lat/lon for **' + n.place + '**'
                  }, function(err, nodes) {
                    if(err)
                      throw err;
                    batch.relate(nodes[0], 'questions', v, {upvote: 1, downvote:0});
                    nextReconciliation(null, n, v, null);
                  });
              } else {
                // handle geonames err, @todo
                console.log(n.place, '-->', body.geonames[0].countryName, '/', body.geonames[0].toponymName); // take the first name
                nextReconciliation(null, n, v, _.assign({
                  q: geonamesURL,
                  countryId: '',
                  countryCode: ''
                }, body.geonames[0]));
              };

                
            });
          else
            nextReconciliation(null, n, v, null);
        },
        /*
          Reconcile with geonames, 2/2: save entity to the db and create a relationship between the resource version and the entity.
          @param n - the picture node
          @param place - the geoname top result from the disambiguation plus the generator query.
        */
        function (n, v, place, nextReconciliation) {
          if(!place) {
            nextReconciliation(null, n, v);
            return;
          }
          neo4j.query(
              'MERGE (k:entity:location { geonameId:{geonameId} })'
            + ' ON CREATE SET '
            + '  k.creation_date = timestamp(), '
            + '  k.geonames_query = {q}, '
            + '  k.geonames_countryId = {countryId}, '
            + '  k.geonames_countryName = {countryName}, '
            + '  k.geonames_countryCode = {countryCode}, '
            + '  k.geonames_toponymName = {toponymName}, '
            + '  k.geonames_lat = {lat}, '
            + '  k.geonames_lng = {lng} '
            + ' ON MATCH SET'
            + '  k.last_modification_date = timestamp(), '
            + '  k.geonames_query = {q}, '
            + '  k.geonames_countryId = {countryId}, '
            + '  k.geonames_countryName = {countryName}, '
            + '  k.geonames_countryCode = {countryCode}, '
            + '  k.geonames_toponymName = {toponymName}, '
            + '  k.geonames_lat = {lat}, '
            + '  k.geonames_lng = {lng} '
            + 'RETURN k', place,
            function(err, nodes) {
              if(err) {
                console.log(err);
                throw(err);
              } else {
                batch.relate(n, 'helds_in', nodes[0], {upvote: 1, downvote:0});
                nextReconciliation(null, n, v);
              }
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
              relationships; // extract entities in resource
          if(items.object.length) {
            for(var i in items.object) {
              var entity = {};
              entity.region  = items.object[i].region;
              if(items.object[i].markers)
                entity.markers  = items.object[i].markers;
              //console.log('MMM', items.object[i].identification);
              if(items.object[i].identification) {
                entity.identification  = items.object[i].identification._;
                entity.uri  = items.object[i].identification.$.id;
              }
              entities.push(entity);
            };
          } else {
            entities.push({
              region: items.object.region,
              identification: items.object.identification._
            })
          };
          
          relationships = async.queue(function (entity, nextRelationship) {
            console.log('connecting ',entity.uri, 'with', n.url);
            if(!entity.uri || entity.uri == '') {
              nextRelationship();
              return 
            }
            neo4j.query(
                'MATCH (a:entity { uri:{uri}}), (n:resource {url:{url}})'
              + 'MERGE (a)-[r:appears_in]->(n)'
              + 'RETURN r',
              {
                uri: entity.uri,
                url: n.url
              }, function(err, rels) {
                if(err)
                  throw (err);
                console.log(rels);
                nextRelationship()
              }
            );
          }, 4);
          
          relationships.push( entities, function(){})
          relationships.drain = function() {
            // add markdown info on resource.
            nextReconciliation(null, n, v);
          }
        },
        /*
          Reconcile date with ISO standard for time windows
          @param n - the picture node
          @param v - the version node
        */
        function (n, v, nextReconciliation) {
          var date = n.date.match(/(\d*)[\sert\-]*(\d*)\s*([^\s]*)\s?(\d{4})/),
              start_date,
              end_date;
          if(!date) {
            nextReconciliation();
            return;
          }
            
          if(!date[1].length && !date[3].length) {
            start_date = moment.utc([1, 'janvier', date[4]].join(' '), 'LL');
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

          n.start_date = start_date.format();
          n.start_time = start_date.format('X');
          n.end_date = end_date.format();
          n.end_time = end_date.format('X');

          // console.log(n.date)
          // console.log('     ',start_date.format());
          // console.log('     ',start_date.format('X'));
          // console.log('     ',end_date.format());
          // console.log('     ',end_date.format('X'));
            
          neo4j.save(n, function(err, node) {
            if(err)
              throw err;
            nextReconciliation();
          })

        }
      ], callback);
    }, 8);

    q.push(pictures, function (err) {if(err)console.log(err)});

    // assign a callback
    q.drain = function(err) {
      console.log('all items have been processed');
      batch.commit(function(err, results) {
        if(err)
          throw err;
        next(null);
      });
      
    }
  },


  

], function (err, result) {
    // result now equals 'done'    
    console.log('finished');
});

     
