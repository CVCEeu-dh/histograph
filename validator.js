/**
  
  Basic request params validation
  ===

*/
var settings = require('./settings'),
    YAML = require('yamljs'),
    _    = require('lodash'),
    validator  = require('validator'),
    moment     = require('moment');

validator.extend('notMatches', function (str, pattern, modifiers) {
  if (Object.prototype.toString.call(pattern) !== '[object RegExp]') {
      pattern = new RegExp(pattern, modifiers);
  }
  return !pattern.test(str);
});

validator.extend('includedIn', function (str, choices) {
  return _.difference(str.split(','), choices).length === 0;
});

validator.extend('isAnnotatorjs', function (str) {
  var q = {};
  try{
    q = JSON.parse(str);
    return q.quote && q.ranges && q.ranges.length;
  } catch(e) {
    console.log('OUCH', e)
    return false;
  }
})

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
  /*
    Special validation fields
  */
  SPECIALS: {
    graphLimit: {
      field: 'limit',
      check: 'isInt',
      args: [
        {min: 1, max: 200}
      ],
      error: 'should be a number in range 1 to max 200'
    },
    query: {
      field: 'query',
      check: 'isLength',
      args: [
        2,
        500
      ],
      error: 'should be 2 to 500 chars',
      optional: false,
      required: true,
    },
    entity: {
      field: 'entity',
      check: 'includedIn',
      args: [
        [
          'entity',
          'person',
          'location',
          'organization',
          'social_group'
        ]
      ],
      error: 'should be something like person, location or organization'
    },
    'with': {
      field: 'with',
      check: 'matches',
      args: [
        /\d[\d,]+/
      ],
      error: 'with should contain only numbers and commas, at least one'
    },
    orderby: {
      field: 'orderby',
      check: 'includedIn',
      args: [
        [
          'date',
          '-date',
          'relevance',
        ]
      ],
      error: 'should be something like picture, press or video'
    },
    issueType: {
      field: 'type',
      check: 'includedIn',
      args: [
        [
          'date'
        ]
      ],
      error: 'should be something like date'
    },
  },
  /*
    Common validation fields
  */
  FIELDS:[
    {
      field: 'id',
      check: 'isInt',
      args: [
        0
      ],
      error: 'id not valid'
    },
    {
      field: 'annotation',
      check: 'isAnnotatorjs',
      args: [
        0
      ],
      error: 'annotation not valid, should be annotatorjs compatible.'
    },
    {
      field: 'center',
      check: 'isInt',
      args: [
        0
      ],
      error: 'center should be a valid integer id'
    },
    {
      field: 'ids',
      check: 'matches',
      args: [
        /\d[\d,]+/
      ],
      error: 'ids should contain only numbers and commas'
    },
    {
      field: 'with',
      check: 'matches',
      args: [
        /[\d,]+/
      ],
      error: 'with should contain only numbers and commas'
    },
    {
      field: 'limit',
      check: 'isInt',
      args: [
        {min: 1, max: 100}
      ],
      error: 'should be a number in range 1 to max 100'
    },
    {
      field: 'offset',
      check: 'isInt',
      args: [
        {min: 0}
      ],
      error: 'should be a number in range 1 to max 50'
    },
    {
      field: 'name',
      check: 'isLength',
      args: [
        3,
        500
      ],
      error: 'should be at least 3 to 160 chars',
      optional: true
    },
    {
      field: 'query',
      check: 'isLength',
      args: [
        2,
        500
      ],
      error: 'should be 2 to 500 chars',
      optional: true
    },
    {
      field: 'title',
      check: 'isLength',
      args: [
        3,
        500
      ],
      error: 'should be 3 to 500 chars',
      optional: true
    },
    {
      field: 'description',
      check: 'isLength',
      args: [
        3,
        2500
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
    },
    {
      field: 'mimetype',
      check: 'includedIn',
      args: [
        [
          'image',
          'text',
          'video'
        ]
      ],
      error: 'should be something like image, text or video'
    },
    {
      field: 'type',
      check: 'includedIn',
      args: [
        settings.types? settings.types.resources: [
          'external-text',
          'picture',
          'press',
          'video',
          'cartoon',
          'facts',
          'letter',
          'facsimile',
          'treaty',
          'sound',
          'table',
          'article',
          'schema',
          'map',
          'graphical-table',
          'scientific-contribution',
          'passport'
        ]
      ],
      error: 'should be something like picture, press or video'
    },
    {
      field: 'from',
      check: 'matches',
      args: [
        /^\d{4}-\d{2}-\d{2}$/
      ],
      error: 'should be in the format YYYY-MM-DD'
    },
    {
      field: 'to',
      check: 'matches',
      args: [
        /^\d{4}-\d{2}-\d{2}$/
      ],
      error: 'should be in the format YYYY-MM-DD'
    },
    {
      field: 'orderby',
      check: 'notMatches',
      args: [
        /(with|match|create|remove|set|delete)\s/i,
      ],
      error: 'It cannot contain reserved keywords"'
    }
  ],
  
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
  request: function(req, params, options, next) {
    var errors     = {},
        warnings   = {},
        safeParams = {},
        params     = _.merge(params || {}, req.query || {}, req.body || {}, req.params || {}),
        
        fields     = module.exports.FIELDS,
        result;
    
    if(typeof options == 'object') {
      // override certain specific fields (format: cfr module.exports.FIELDS)
      if(options.fields)
        fields = _.unique((options.fields || []).concat(module.exports.FIELDS), 'field');
      // specify which fields are required (when usually they're not) or viceversa. Cfr module.exports.FIELDS
      
    }
    
    // verify  
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
    
    if(safeParams.ids)
      safeParams.ids = _.compact(safeParams.ids.split(',')).map(function(d) {
        return +d;
      });
    
    if(safeParams.with)
      safeParams.with = _.compact(safeParams.with.split(',')).map(function(d) {
        return +d;
      });
    
    if(safeParams.limit)
      safeParams.limit = +safeParams.limit;
    
    if(safeParams.offset)
      safeParams.offset = +safeParams.offset;
    
    if(typeof safeParams.mimetype == 'string')
      safeParams.mimetype = safeParams.mimetype.split(',');
    
    if(params.from) {
      safeParams.start_date = moment.utc(params.from,'YYYY-MM-DD', true);
      safeParams.start_time = +safeParams.start_date.format('X');
    };
    
    if(params.to) {
      safeParams.end_date = moment.utc(params.to,'YYYY-MM-DD', true);
      safeParams.end_time = +safeParams.end_date.format('X');
    };
    
    if(typeof safeParams.type == 'string')
      safeParams.type = safeParams.type.split(',');
    
    if(safeParams.annotation) {
      // console.log('HELLO', YAML.stringifyJSON.parse(safeParams.annotation));

      safeParams.annotation = YAML.stringify(JSON.parse(safeParams.annotation), 2);
    }

    if(next)
      next(null, safeParams);
      return {
        isValid: true,
        params: safeParams
      };
  }
};