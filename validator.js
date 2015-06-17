/**
  
  Api params glue
  ===

*/
var YAML = require('yamljs'),
    _    = require('lodash');
    moment    = require('moment');


module.exports = {
  /**
    usage: wrap the function with
    validator.queryParams(req.query, function (err, safeParams, warnings) {
      ...
    )}
  */
  queryParams: function(params, next) {
    var safeParams = {
          limit: 50,
          offset: 0
        },
        errors     = {}, // next error
        warnings   = {}; // next with safeparams and warnings
    
    if(params.limit) {
      // update safeParams limit
    };
    // transform YYYY-mm-dd valid dates to ISO timestamps
    if(params.from) {
      safeParams.start_date = moment.utc(params.from,'YYYY-MM-DD', true);
      if(!safeParams.start_date.isValid())
        errors.start_date = 'not a valid date';
      else
        safeParams.start_time = +safeParams.start_date.format('X');
    };
    if(params.to) {
      safeParams.end_date = moment.utc(params.to,'YYYY-MM-DD', true);
      if(!safeParams.end_date.isValid())
        errors.end_date = 'not a valid date'
      else
        safeParams.end_time = +safeParams.end_date.format('X');
     
    };
    
    if(safeParams.start_time != undefined && safeParams.end_time != undefined && safeParams.start_time > safeParams.end_time) {
      warnings.end_date = 'check that params.to';
    }
    if(_.isEmpty(errors))
      next(null, safeParams, warnings);
    else
      next(errors);
  }
};