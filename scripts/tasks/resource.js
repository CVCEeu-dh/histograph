/*
  
  Resource task collection
*/
var helpers = require('./helpers'),
    async    = require('async'),
    Resource = require('../../models/resource');

module.exports = {
  
  importData: function(options, callback) {
    console.log(' load data');
    console.log(options.data);
    
    async.queue(function (resource, next) {
      Resource.create(resource, function(err) {
        if(err) {
          q.kill();
          callback(err)
        } else {
          next();
        }
      })
    }, 3);
    q.push(options.data);
    q.drain = next;
    callback();
  },
  exportData: function(options, callback) {
    console.log('export data')
    callback()
  }
}