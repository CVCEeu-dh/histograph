HG
===
! __wip__

HG is the new Histograph, a node-express application.

## installation
Once cloned, 
	
	npm install

Then copy paste the settings.example.js to settings.js
	
	cp settings.example.js setttings.js

Run the setup script: it will add some constraint to the neo4j db.

	node scripts\manage.js --task=setup

Modify fields accordingly, then test in order to check that everything has been installed.

	npm test


## import data: manage.js script
Data can be loaded directly as Neo4j node, but the best so far in order to deal with data **import** and **export** in histograph is running
	
	node scripts\manage.js

e.g to import data in histograph:


	node scripts\manage.js --task=import-resources --source=contents\resources.tsv.example

	
## Named Entity Recognition
Histograph enable the enrichment of resources with different webservices. The most reliable is yagoaida, developed by the team at Max Plank Institute.
Yago entity extracton is enabled by default, but the disambiguation engine works only for english texts.

First of all, set the correct endpoint to yago aida in settings.js:


  	yagoaida: {
    	endpoint: 'https://gate.d5.mpi-inf.mpg.de/aida/service/disambiguate' 
  	},

Then make sure that the disambiguation services include yagoaida:

  	disambiguation: {
    	fields: [
      		"title",
      		"caption"
    	],
        services: {
            "yagoaida": ['en']
        }
	}
 


## dealing with migration
Migration folder contains some scripts useful to migrate from the previous dataset composed of many json and xml files to the neo4j database.
These scripts deal with *reconciliation* as well: reconciliation for human date, locally written; for geographical data, disambiguated by using two geolocation services api (geonames and google geocoding); and for person. Basically the `migrate` script solve the first problem:
	
	npm run-script migrate

and the `resolve` script allows you to resolve disambiguation

  npm run-script resolve


## troubleshooting
### geocoding api setup
Create a new project at [console.developers.google](https://console.developers.google.com/project "https://console.developers.google.com/project"), then select the **geocoding api**
under the `api & auth` menu, copy the api key to the geocoding section of your `settings.js` file.
	
	geocoding: { // google geocoding api
    	endpoint: 'https://maps.googleapis.com/maps/api/geocode/json',
    	key: ''
  	},

 More info available at [geocoding documentation page](https://developers.google.com/maps/documentation/geocoding/)

