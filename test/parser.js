/*
  
  Testing parser
  ===
  
  usage: mocha -g 'parsers:'
*/
'use strict';

var parser  = require('../parser.js'),
    helpers = require('../helpers.js'),
    should  = require('should');



describe('parser:lucene', function() {
  it('understand a good natural query', function (done) {
    var q = parser.toLucene('ciao "mamma bella" ciao', 'field_to'); // complete 
    should.equal(q, 'field_to:*ciao* OR field_to:"mamma bella" OR field_to:*ciao*')
    done();
  });

  it('understand a not yet complete natural query', function (done) {
    var q   = parser.toLucene('ciao "mamma bella ciao', 'field_to'), // incomplete
        q1  = parser.toLucene('ciao "mamma bella ciao" che "', 'field_to'), // incomplete
        q2  = parser.toLucene('ciao "mamma bella ciao" che "ci siamo', 'field_to'); // incomplete
    should.equal(q, 'field_to:*ciao* OR field_to:*mamma* OR field_to:*bella* OR field_to:*ciao*');
    should.equal(q1, 'field_to:*ciao* OR field_to:"mamma bella ciao" OR field_to:*che*');
    should.equal(q2, 'field_to:*ciao* OR field_to:"mamma bella ciao" OR field_to:*che* OR field_to:*ci* OR field_to:*siamo*');
    done();
  })

  it('ignore lucene query provided by the user', function (done) {
    var q   = parser.toLucene('ciao AND title:"mamma" bella ciao', 'field_to'); // incomplete
    
    done();
  })
});

describe('parser:paragraphs', function() {
  it('should split a long document in paragraphs', function (done) {
    // body...
    // var fs = require('fs');
    var paragraphs = parser.paragraphs({
      text: " In olden times when wishing still helped one, there lived a king" + 
            " whose daughters were all beautiful, but the youngest was so beautiful" +
            " that the sun itself, which has seen so much, was astonished whenever" +
            " it shone in her face.\n\n" +
            "  Close by the king's castle lay a great dark" +
            " forest, and under an old lime-tree in the forest was a well, and when" +
            " the day was very warm, the king's child went out into the forest and" +
            " sat down by the side of the cool fountain, and when she was bored she" +
            " took a golden ball, and threw it up on high and caught it, and this" +
            " ball was her favorite plaything.\n\n" +
            " Now it so happened that on one occasion the princess's golden ball" +
            " did not fall into the little hand which she was holding up for it," +
            " but on to the ground beyond, and rolled straight into the water.  The" +
            " king's daughter followed it with her eyes, but it vanished, and the" +
            " well was deep, so deep that the bottom could not be seen.  At this" +
            " she began to cry, and cried louder and louder, and could not be" +
            " comforted.  And as she thus lamented someone said to her, \"What ails" +
            " you, king's daughter?  You weep so that even a stone would show pity.\""
    });
    should.equal(paragraphs.length, 3)
    done()
  });
});


describe('parser:annotate and chunk', function() {
  var points,
      text = 'European Parliament Resolution on the Treaty of Nice and the future of the European Union (31 May 2001)§ European Parliament resolution of 31 May 2001 incorporating Parliament’s opinion on the Treaty of Nice and the Declaration on the Future of Europe. The European Parliament notes that the Treaty of Nice removes the last remaining formal obstacle to enlargement but considers that a Union of 27 or more Member States requires more thoroughgoing reforms in order to guarantee democracy, effectiveness, transparency, clarity and governability§ Mention par défaut (oeuvres du domaine public).';

  it('should correctly parse the yaml', function (done) {
    // body...
    points = parser.yaml('-\n    id: 25867\n    context: {left: 48, right: 52}\n-\n    id: 27023\n    context: {left: 71, right: 89}\n-\n    id: 27023\n    context: {left: 75, right: 89}\n-\n    id: 25867\n    context: {left: 203, right: 207}\n-\n    id: 27034\n    context: {left: 245, right: 251}\n-\n    id: 25867\n    context: {left: 302, right: 306}\n-\n    id: 18317\n    context: {left: 48, right: 52}\n-\n    id: 27025\n    context: {left: 71, right: 89}\n-\n    id: 27025\n    context: {left: 75, right: 89}\n-\n    id: 18317\n    context: {left: 203, right: 207}\n-\n    id: 27035\n    context: {left: 245, right: 251}\n-\n    id: 18317\n    context: {left: 302, right: 306}');
    should.equal(points.length, 12);

    done()
  });
  
  it('should output the matching chunks for two specific id, not overlapping', function (done) {
    // body...
    var annotateMatches =  parser.annotateMatches(text, {
      ids: [25867, 27035],
      points: points
    });
    
    should.equal(annotateMatches, 'European Parliament Resolution on the Treaty of [Nice](25867) and the future of the European Union (31 May 2001 [...] corporating Parliament’s opinion on the Treaty of [Nice](25867) and the Declaration on the Future of [Europe](27035). The European Parliament notes that the Treaty of [Nice](25867) removes the last remaining formal obstacle to enl [...] ')
    // console.log(annotateMatches)
    done()
  });
  
  it('should output the matching chunks for two specific id, with offset', function (done) {
    // body...
    var annotateMatches =  parser.annotateMatches('jKl'+text, {
      ids: [25867, 27035],
      points: points,
      offset: -3
    });
    should.equal(annotateMatches, ' [...] KlEuropean Parliament Resolution on the Treaty of [Nice](25867) and the future of the European Union (31 May 2001 [...] corporating Parliament’s opinion on the Treaty of [Nice](25867) and the Declaration on the Future of [Europe](27035). The European Parliament notes that the Treaty of [Nice](25867) removes the last remaining formal obstacle to enl [...] ')
    done()
  });
  
  it('should correctly rebuild the chain based on the yaml', function (done) {
    // note that the chain is joined with '§ '
    
    var annotated = parser.annotate(text, points);

    should.equal(annotated, "European Parliament Resolution on the Treaty of [Nice](25867,18317) and the future of [the ](27023,27025)[European Union](27023,27025) (31 May 2001)§ European Parliament resolution of 31 May 2001 incorporating Parliament’s opinion on the Treaty of [Nice](25867,18317) and the Declaration on the Future of [Europe](27034,27035). The European Parliament notes that the Treaty of [Nice](25867,18317) removes the last remaining formal obstacle to enlargement but considers that a Union of 27 or more Member States requires more thoroughgoing reforms in order to guarantee democracy, effectiveness, transparency, clarity and governability§ Mention par défaut (oeuvres du domaine public).");

    done()
  });
});

describe('parser:agentBrown cypher template parser', function() {
  it('should correctly rebuild the CYPHER query based on WHERE clause', function (done) {
    var q1 = parser.agentBrown('MATCH (nod) {?nod:start_time__gt} {AND?nod:end_time__lt} RETURN N', {
      start_time: 56908878,
      end_time: 556908879
    });
    
    should.equal(q1, 'MATCH (nod) WHERE nod.start_time >= {start_time} AND nod.end_time <= {end_time} RETURN N')
    
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
    should.equal(q3, 'MATCH (inq:inquiry)--(res:resource)  WHERE id(res) = {resource_id} RETURN count(*)');
    
    done()
  });
  
  it('should rebuild the CYPHER query based on UNLESS template', function (done) {
    var query = '{if:links_wiki} '+
          '  MERGE (ent:entity:{:type} {links_wiki: {links_wiki}}) '+
          '{/if} ' +
          '{unless:links_wiki} ' +
          '  MERGE (ent:entity:{:type} {name:{name}}) ' +
          '{/unless} ON CREATE SET';
          
    var q1 = parser.agentBrown(query, {
      type: 'person',
      name: 'ciccio'
    });
    should.equal(q1.trim().replace(/\s+/g, ' '), 'MERGE (ent:entity:person {name:{name}}) ON CREATE SET')
    
    var q2 = parser.agentBrown(query, {
      type: 'person',
      links_wiki: 'ciccio_wiki'
    });
    should.equal(q2.trim().replace(/\s+/g, ' '), 'MERGE (ent:entity:person {links_wiki: {links_wiki}}) ON CREATE SET')
    
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
  
  it('should correctly rebuild the CYPHER query based on template', function (done) {
    var q1 = parser.agentBrown('\nMATCH (ent:{:type}) WHERE', {
      type: 'person'
    });
    should.equal(q1.trim(), 'MATCH (ent:person) WHERE');
    done()
  });
});