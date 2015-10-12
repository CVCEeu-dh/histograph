/*jslint node: true */
var fs          = require('fs'),
    options     = {
      cypher: "playground/bb_get_cooccurrences",
      limit: 500,
      offset: 0
    },
    async       = require('async'),
    clc         = require('cli-color'),
    _           = require('lodash'),
    tasks       = require('require-all')({
                    dirname: __dirname + '/../tasks',
                    filter  :  /(.*).js$/
                  }),
    query       = tasks.helpers.cypher.perf,
    tick        = tasks.helpers.tick,
    ticker      = { verbose: false };
    

console.log(clc.whiteBright( "Starting perfomance test for " + options.cypher + "..."));

var sampleSize = 5,
    sampleConfig = [],
    sample = 1,
    sampleValues = [];

_.range(sampleSize).forEach(function() {
  sampleConfig = sampleConfig.concat([
    tick.start,
    function (options, callback) {
      console.log('exec rep. ' + sample)
      query(options, function(err, results) {
        if (err) {
          callback(err);
        } else {
          console.log('rep. ' + sample)
          sample = sample + 1;
          callback(null, options)
        }
      });
    },
    tick.end
  ]);
});


async.waterfall([
    function init(callback) {
      callback(null, options);
    }
  ].concat(sampleConfig), function (err, res) {
  console.log('min. time', res.timer.min()/1000000000, 's.')
  console.log('max. time', res.timer.max()/1000000000, 's.')
  // console.log(res)
})
