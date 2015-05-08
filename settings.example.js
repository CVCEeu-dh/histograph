/**

  Config file
  ===
*/
module.exports = {
  secret: {
    cookie: 'cookie secret', // cookie salt
    salt: 'salt secret for password', // password salt
    activation: 'activation salt for activation link', // password salt
  },
  
  paths: {
    accesslog: './logs/access.log'
  },

  neo4j : {
    host: 'http://localhost:7474'
  },
  
  dbpedia: {
    endpoint: 'http://dbpedia.org/data/',
    lookup: {
      endpoint: 'http://lookup.dbpedia.org/api/search.asmx/PrefixSearch'
    }
  },
  
  viaf: {
    endpoint: 'http://www.viaf.org/viaf/',
    format: 'viaf.xml'
  },
  
  yagoaida: {
    endpoint: 'https://gate.d5.mpi-inf.mpg.de/aida/service/disambiguate' 
  },
  
  resourcespath: '', // abs location of the media (img) folder
  
  // if you wish to authenticate people with their twitter account
  TWITTER_CONSUMER_KEY: 'XXXXX',
  TWITTER_CONSUMER_SECRET: 'XXXXX',

  ALCHEMYAPI_KEY: 'your alchemy api key', // cfr alchemyapi.com
  REKOGNITIONAPI_KEY : 'your rekognition qapi key', // cfr rekognition.com
  REKOGNITIONAPI_SECRET : 'your rekognition api secret',
  SKYBIOMETRYAPI_KEY : 'your skybiometry api', // cfr skybiometry https://www.skybiometry.com/Account
  SKYBIOMETRYAPI_SECRET : 'your skybiometry api secret' 
};