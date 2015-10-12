/*jslint node: true */
var fs          = require('fs'),
    options     = {
      cypher: "playground/bb_get_cooccurrences",
      limit: 500,
      offset: 0,
      verbose: false
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
      process.stdout.write("Taking sample " + sample + "/" + sampleSize + "\r");
      query(options, function(err, results) {
        if (err) {
          callback(err);
        } else {
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
    if (err) {
      console.log(err);
    } else {
      process.stdout.clearLine();
      console.log("Done.");
      console.log(res.timer.ticks.map(function(tick) {
        return tick.getDiff()/1000000000;
      }));

      console.log();
      console.log("-  min: " + res.timer.min());
      console.log("- mean: " + res.timer.mean());
      console.log("-  max: " + res.timer.max());
    }
})
