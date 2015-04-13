/**
  Create BASICS crowdsourcings csv files.
*/
var fs   = require('fs'),
    
    settings   = require('../settings'),
    helpers    = require('../helpers.js'),
    
    neo4j = require('seraph')(settings.neo4j.host),
    async = require('async'),
    _     = require('lodash'),

    csv = require('csv');


/*
  This queue for each entity:location NOT HAVING a name field

*/
var queue = async.waterfall([
    // CROWDsourcing #1: check that the context contains the date and that the date span calculated matched something useful
    // GET all the resources having a date
    function (next) {
      neo4j.query('MATCH (n:`resource`) WHERE has(n.date) RETURN n LIMIT 50', function (err, resources) {
        if(err)
          throw err;
        // csv cascades
        csv.stringify(resources.map(function (d) {
          return {
            question: 'check the date',
            date: d.date,
            context: _.without([d.name, d.title, d.source], undefined, '').join('\n'),
            start_date: d.start_date,
            end_date: d.end_date,
            resource_doi: d.doi,
            resource_id: d.id
          }
        }), function(err, data){
          var now = helpers.now();
          console.log(now);
          fs.writeFile( settings.paths.crowdsourcing + '/' + 'check_dates.csv', 'question,date,context,start_date,end_date,doi,resource_id\n' + data, function (err) {
            if(err)
              throw err;
            next();
          })
        });
      });
    },
    

  ], function(){

    console.log('completed');
  });