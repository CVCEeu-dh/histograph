/*
  
  Resource task collection
*/

module.exports = {
  
  importData: function(callback) {
    console.log(' load data');
    callback();
  },
  exportData: function(callback) {
    console.log('export data')
  }
}