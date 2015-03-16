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

  neo4j : {
    host: 'http://localhost:7474'
  },

  // if you wish to authenticate people with their twitter account
  TWITTER_CONSUMER_KEY: 'XXXXX',
  TWITTER_CONSUMER_SECRET: 'XXXXX',

  ALCHEMYAPI_KEY: 'your alchemy api key', // cfr alchemyapi.com
  REKOGNITIONAPI_KEY : 'your rekognition qapi key', // cfr rekognition.com
  REKOGNITIONAPI_SECRET : 'your rekognition api secret',
  SKYBIOMETRYAPI_KEY : 'your skybiometry api', // cfr skybiometry https://www.skybiometry.com/Account
  SKYBIOMETRYAPI_SECRET : 'your skybiometry api secret' 
};