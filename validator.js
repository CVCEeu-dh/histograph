/**
  
  Basic request params validation
  ===

*/
var YAML = require('yamljs'),
    _    = require('lodash'),
    validator  = require('validator'),
    moment     = require('moment');

/*
  Verify that for each field in form, everything looks good.
  @params form    - req.body and/or req.params
  @params fields  - array of validation techniques per field.
  @return true or the array of not valid fields
*/
function verify(form, fields, options) {
  var options = options || {},
      errors = [];
      
  if(options.strict) {
    for(var i in fields) {
      if(fields[i].optional && !form[fields[i].field])
        continue;
      if(!validator[fields[i].check].apply(this, [form[fields[i].field]].concat(fields[i].args))) {
        errors.push(fields[i]);
      }
    }
  } else {
    var indexes = _.map(fields, 'field');
    
    for(var i in form) {
      var index = indexes.indexOf(i);
      if(index == -1)
        continue;
      // console.log(indexes, index, fields[index], i)
      // console.log(i, form[i], fields[index].check)
      if(!validator[fields[index].check].apply(this, [form[i]].concat(fields[index].args))) {
        fields[index].value = form[i];
        errors.push(fields[index]);
      }
    }
  }
      
  if(errors.length)
    return errors;
  return true;
};


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
  },
  
  /*
    Validate request.body against POST data.
    It uses validate and provide the right validation to the right field.
    @param params   - predefined params
    
  */
  request: function(req, params, next) {
    var errors     = {},
        safeParams = {},
        params     = _.merge(params || {}, req.query || {}, req.body || {}, req.params || {}),
        
        fields     = [
          {
            field: 'id',
            check: 'isInt',
            args: [
              0
            ],
            error: 'id not valid'
          },
          {
            field: 'limit',
            check: 'isInt',
            args: [
              1,
              50
            ],
            error: 'should be a number in range 1 to max 50'
          },
          {
            field: 'offset',
            check: 'isInt',
            args: [
              0
            ],
            error: 'should be a number in range 1 to max 50'
          },
          {
            field: 'name',
            check: 'isLength',
            args: [
              3,
              160
            ],
            error: 'should be at least 3 to 160 chars',
            optional: true
          },
          {
            field: 'description',
            check: 'isLength',
            args: [
              3,
              250
            ],
            error: 'should be at least 3 to 250 chars'
          },
          {
            field: 'password',
            check: 'isLength',
            args: [
              8,
              32
            ],
            error: 'password have to ...'
          }
        ],
        result;
    
    result = verify(params, fields);
    // errors?
    if(result !== true) {
      if(next)
        next(result);
      else
        return {
          isValid: false,
          errors: result
        };
    }
    // sanitize here the params if required (e.g, limit and offset if they're exagerated etc..)...
    safeParams = params;
    if(safeParams.id)
      safeParams.id = +safeParams.id;
    if(safeParams.limit)
      safeParams.limit = +safeParams.limit;
    if(safeParams.offset)
      safeParams.offset = +safeParams.offset;
    if(next)
      next(null, safeParams);
    else
      return {
        isValid: true,
        params: safeParams
      };
  }
};