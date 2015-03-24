module.exports = {
  metadataPath: {
    translations : '.../table.json',
    resources: '.../dataset/photos.xml',
    persons: '.../entities_enriched_with_links.json'
  
  },
  ignoreICS: false,
  ignorePersons: true,
  ICSPath: '.../dataset/ics',
  neo4j : {
    host: 'http://localhost:7474'
  },
  geonames : {
    username: 'demo',
    reconcile: false
  },
  geocoding : {
    reconcile: false
  },
}