/*jslint node: true */
var fs          = require('fs'),
    options     = {
      cypher: "playground/bb_get_cooccurrences",
      limit: 500,
      offset: 0
    },
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

var sampleSize = 100,
    sample = 1,
    sampleValues = [];

tick.start(ticker, function() {});
query(options, function(err, results) {
  tick.end(ticker, function(duration) {
    console.log(duration);
  });
  
  if (err) {
    console.log(clc.red("Error: " + err));
  }
});
