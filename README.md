HG
===

! __wip__

HG is the new Histograph, a node-express application aiming at providing digital humanities specialists with an online collaborative environment.
Connections between people, documents and pictures are stored in a [Neo4j](http://neo4j.com/) graph database.

## installation
Once cloned, 
	
	npm install

Then copy paste the settings.example.js to settings.js
	
	cp settings.example.js setttings.js

Install [Neo4j](http://neo4j.com/) version: 2.1.8 and set database properties to deal with auto_indexing in `conf/neo4j.properties` file.

	# Autoindexing

	# Enable auto-indexing for nodes, default is false
	node_auto_indexing=true

	# The node property keys to be auto-indexed, if enabled
	node_keys_indexable=full_search,name_search

Complete the installation by pointing to a location in your system that will store the neo4j data (`conf/neo4j-server.properties`)

	
	# location of the database directory
	org.neo4j.server.database.location=data/graph.db

Run then the setup script: it will add some constraint to neo4j db.

	node scripts\manage.js --task=setup

Modify neo4j related configuration in your histograph settings.js file, then run tests and check that everything runs properly.

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

