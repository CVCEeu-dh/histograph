/*
  Maintenance script: entities 
  ============================
  
  get entity duplicates and resolve probable mistakes.
  it makes use of queries/maintenance.cyp.
  Usage :
  var entities = require('../scripts/maintenance.entities')
*/
var settings = require('../settings'),
    helpers  = require('../helpers'),
    
    queries  = require('decypher')('queries/maintenance.cyp'),
    neo4j    = require('seraph')(settings.neo4j.host),
    
    async    = require('async'),
    clc      = require('cli-color'),
    _        = require('lodash');
    
    
module.exports = {
  /*
    Return a list of probable duplicates by wiki, probably wrongly disambiguated (like Papandreu)
  */
  get_entity_duplicates_by_wiky: function(next) {
    neo4j.query(queries.get_entity_duplicates_candidates_by_wiky, function (err, candidates) {
      if(err) {
        next(err)
        return;
      }
      console.log(clc.blackBright('  get_entity_duplicates_candidates_by_wiky'), clc.white.bgMagenta(candidates.length));
      var records = [];
      candidates.forEach(function (candidate) {
        candidate.entities.forEach(function (d) {
          records.push({
            id: d.id,
            doi: d.doi,
            name: d.name,
            url: 'http://histograph.cvce.eu/#/e/' + d.id,
            first_name: d.first_name || '',
            last_name: d.last_name || '',
            birth_date: d.birth_date,
            death_date: d.death_date,
            birth_place: d.birth_place,
            links_viaf: d.links_viaf,
            links_wiki: d.links_wiki
            
          })
        })
      });
      // enrich records with first names and last names
      var q = async.queue(function (record, nextRecord) {
        console.log(clc.yellowBright(record.name))
        helpers.dbpediaPerson(record.links_wiki, function (err, wiki) {
          
          if(err)
            return nextRecord()
          
          record.wiki_first_name = wiki.first_name
          record.wiki_last_name = wiki.last_name
          record.wiki_birth_date = wiki.birth_date
          record.wiki_death_date = wiki.death_date;
          
          setTimeout(function(){
            nextRecord()
          }, 500);
        })
      }, 1)
      q.push(records)
      q.drain = function() {
        next(null, {
          records: records, 
          fields: ["id", "doi", "name", "url", "first_name", "last_name", "birth_date", "death_date", "wiki_first_name", "wiki_last_name", "wiki_birth_date", "wiki_death_date"],
          name: 'entity_duplicates_by_wiky'
        });
      }
      
    })
  },
  
  get_entity_homonyms: function(next) {
    neo4j.query(queries.get_entity_duplicates_candidates_by_name, function (err, candidates) {
      if(err) {
        next(err)
        return;
      }
      console.log(clc.blackBright('  get_entity_homonyms'), clc.white.bgMagenta(candidates.length));
      
      var records = [];
      candidates.forEach(function (candidate) {
        candidate.entities.forEach(function (d) {
          records.push({
            id: d.id,
            doi: d.doi,
            name: d.name,
            url: 'http://histograph.cvce.eu/#/e/' + d.id,
            first_name: d.first_name || '',
            last_name: d.last_name || '',
            birth_date: d.birth_date,
            death_date: d.death_date,
            birth_place: d.birth_place,
            links_viaf: d.links_viaf,
            links_wiki: d.links_wiki
            
          })
        })
      });
    })
  }
  
};