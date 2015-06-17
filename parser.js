/**
  Our parser. with test
*/
var YAML = require('yamljs'),
    _    = require('lodash');


module.exports = {
  /**
    Neo4j Chypher filter query parser. REplace the {?<neo4jVariableName>}
    with proper WHERE chain.
  */
  agentBrown: function(cypherQuery, filters) {
    var _concatenate = false,
        methods = {
          lt: '<=',
          gt: '>=',
          slt: '<', 
          sgt: '>',
          equals: '=',
          differs: '<>',
          pattern: '=~' // MUST be replaced by a neo4j valid regexp.
        };
        
    return cypherQuery.replace(/\{(AND|OR)?\?([a-z_A-Z]+):([a-z_A-Z]+)__([a-z_A-Z]+)\}/g, function (m, operand, node, property, method) {
      var chunk = '';
      
      if(!methods[method])  
        throw method + ' method is not available supported method, choose between ' + JSON.stringify(methods);
      
      if(!filters[property])
        return '';
      
      if(_concatenate && operand == undefined)
        _concatenate = false; // start with WHERE
      
      if(!_concatenate)
        chunk = ['WHERE', node + '.' + property, methods[method], filters[property]].join(' ') 
      else 
        chunk = [operand, node + '.' + property, methods[method], filters[property]].join(' ');
      
      _concatenate = true;
      return chunk;
    })
  },
  /**
   annotate a string acciording to the splitpoints.
   points is a Yaml
   */
  annotate: function(content, points) {
    var splitpoints = [], // sorted left and right points in order to segment content. 
        chunks = []; // the annotation chunks to be enriched.
    
    // sort points by context.left ASC, context.right ASC
    points = _.sortBy(points, function(d){
      return d.context.left + d.context.right
    });
    
    
    // array of left plus right splitpoint to chunk the string
    splitpoints = _.sortBy(_.unique([0, content.length].concat(
      _.map(points, function(d){
        return d.context.left
      })).concat(
      _.map(points, function(d){
        return d.context.right
      }))
    ), function(d) {
      return d
    });
    
    for(var i = 0; i < splitpoints.length - 1; i++) {
      chunks.push({
        s: content.slice(splitpoints[i], splitpoints[i + 1]),
        l: splitpoints[i],
        r: splitpoints[i + 1],
        links: _.map(_.filter(points, {context:{left:splitpoints[i]}}), 'id')
      })
    };
    
    // join chunks as markdown string like a pro
    return _.reduce(chunks, function(reduced, c) {
      var res = [reduced.s || reduced];
      
      if(c.links.length)
        res.push('[', c.s, '](', c.links.join(','), ')');
      else
        res.push(c.s);

      return res.join('');
    });
  },

  yaml: function(yaml) {
    return YAML.parse(yaml)
  }
};