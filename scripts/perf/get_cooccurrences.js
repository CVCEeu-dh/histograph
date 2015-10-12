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

function takeSample(callback) {
  console.log(clc.yellowBright(" - Taking sample " + sample));
  tick.start(ticker, function() {});
  query(options, function(err, results) {
    if (err) {
      callback(err);
    } else {
      sample = sample + 1;
      tick.end(ticker, function(duration) {
        callback(null, duration);
      });
    }
  });
}

_.range(sampleSize).forEach(function() {
  sampleConfig.push(takeSample);
});

async.series(sampleConfig, function(err, res) {
  console.log(res)
})
