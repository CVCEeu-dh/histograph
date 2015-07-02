/*
  
  Testing parser
  ===
  
  usage: mocha -g 'parsers:'
*/
'use strict';

var parser  = require('../parser.js'),
    helpers = require('../helpers.js'),
    should  = require('should');

describe('parsers: split a string, add annotations.', function() {
  var points;

  it('should correctly parse the yaml', function (done) {
    // body...
    points = parser.yaml('-\n    id: 25867\n    context: {left: 48, right: 52}\n-\n    id: 27023\n    context: {left: 71, right: 89}\n-\n    id: 27023\n    context: {left: 75, right: 89}\n-\n    id: 25867\n    context: {left: 203, right: 207}\n-\n    id: 27034\n    context: {left: 245, right: 251}\n-\n    id: 25867\n    context: {left: 302, right: 306}\n-\n    id: 18317\n    context: {left: 48, right: 52}\n-\n    id: 27025\n    context: {left: 71, right: 89}\n-\n    id: 27025\n    context: {left: 75, right: 89}\n-\n    id: 18317\n    context: {left: 203, right: 207}\n-\n    id: 27035\n    context: {left: 245, right: 251}\n-\n    id: 18317\n    context: {left: 302, right: 306}');
    should.equal(points.length, 12);

    done()
  });

  it('should correctly rebuild the chain based on the yaml', function (done) {
    // note that the chain is joined with '§ '
    var text = 'European Parliament Resolution on the Treaty of Nice and the future of the European Union (31 May 2001)§ European Parliament resolution of 31 May 2001 incorporating Parliament’s opinion on the Treaty of Nice and the Declaration on the Future of Europe. The European Parliament notes that the Treaty of Nice removes the last remaining formal obstacle to enlargement but considers that a Union of 27 or more Member States requires more thoroughgoing reforms in order to guarantee democracy, effectiveness, transparency, clarity and governability§ Mention par défaut (oeuvres du domaine public).';

    var annotated = parser.annotate(text, points);

    should.equal(annotated, "European Parliament Resolution on the Treaty of [Nice](25867,18317) and the future of [the ](27023,27025)[European Union](27023,27025) (31 May 2001)§ European Parliament resolution of 31 May 2001 incorporating Parliament’s opinion on the Treaty of [Nice](25867,18317) and the Declaration on the Future of [Europe](27034,27035). The European Parliament notes that the Treaty of [Nice](25867,18317) removes the last remaining formal obstacle to enlargement but considers that a Union of 27 or more Member States requires more thoroughgoing reforms in order to guarantee democracy, effectiveness, transparency, clarity and governability§ Mention par défaut (oeuvres du domaine public).");

    done()
  });

  it('should correctly rebuild the CYPHER query based on WHERE clause', function (done) {
    var q1 = parser.agentBrown('MATCH (nod) {?nod:start_time__gt} {AND?nod:end_time__lt} RETURN N', {
      start_time: 56908878,
      end_time: 556908879
    });
    
    should.equal(q1, 'MATCH (nod) WHERE nod.start_time >= 56908878 AND nod.end_time <= 556908879 RETURN N')
    
    var q2 = parser.agentBrown(
      'MATCH (inq:inquiry)--(res:resource) '+
      ' {?res:resource_id__ID} '+
      'RETURN count(*)', {
        
      });
    should.equal(q2, 'MATCH (inq:inquiry)--(res:resource)   RETURN count(*)')
    
    var q3 = parser.agentBrown(
      'MATCH (inq:inquiry)--(res:resource) '+
      ' {?res:resource_id__ID} '+
      'RETURN count(*)', {
        resource_id: 1203
      });
    should.equal(q3, 'MATCH (inq:inquiry)--(res:resource)  WHERE id(res) = 1203 RETURN count(*)');
    
    done()
  });
  
  it('should correctly rebuild the CYPHER query based on template', function (done) {
    var filteredQuery = parser.agentBrown('MATCH (nod) SET {each:language in languages} {:title_%(language)} = {{:title_%(language)}} {/each} RETURN N', {
      languages: ['en', 'fr', 'de', 'it']
    });
    should.equal(filteredQuery, 'MATCH (nod) SET  title_en = {title_en} ,  title_fr = {title_fr} ,  title_de = {title_de} ,  title_it = {title_it}  RETURN N')
    done()
  });
  
  it('should correctly rebuild the CYPHER query based on template', function (done) {
    var q1 = parser.agentBrown('\n{each:language in languages}\nres.{:title_%(language)} = {{:title_%(language)}},\nres.{:caption_%(language)} = {{:caption_%(language)}}{/each}\n', {
      languages: ['en', 'fr', 'de', 'it']
    });
    should.equal(q1.trim(),   'res.title_en = {title_en}, res.caption_en = {caption_en},  res.title_fr = {title_fr}, res.caption_fr = {caption_fr},  res.title_de = {title_de}, res.caption_de = {caption_de},  res.title_it = {title_it}, res.caption_it = {caption_it}');
    done()
  });
});