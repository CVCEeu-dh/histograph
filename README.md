

## installation

npm install
npm test

in order to test recognition api, please add two jpg file inside the test folder
test.jpg
test-single.jpg


## dealing with migration
Migration folder contains some scripts useful to migrate from the previous dataset composed of many json and xml files to the neo4j database.
These scripts deal with *reconciliation* as well: reconciliation for human date, locally written; for geographical data, disambiguated by using two geolocation services api (geonames and google geocoding); and for person. Basically the `migrate` script solve the first problem:
	
	npm run-script migrate

and the `resolve` script allows you to resolve disambiguation

  npm run-script resolve

## typekit

´´´javascript

  (function(d) {
    var config = {
      kitId: 'fwe7tir',
      scriptTimeout: 3000
    },
    h=d.documentElement,t=setTimeout(function(){h.className=h.className.replace(/\bwf-loading\b/g,"")+" wf-inactive";},config.scriptTimeout),tk=d.createElement("script"),f=false,s=d.getElementsByTagName("script")[0],a;h.className+=" wf-loading";tk.src='//use.typekit.net/'+config.kitId+'.js';tk.async=true;tk.onload=tk.onreadystatechange=function(){a=this.readyState;if(f||a&&a!="complete"&&a!="loaded")return;f=true;clearTimeout(t);try{Typekit.load(config)}catch(e){}};s.parentNode.insertBefore(tk,s)
  })(document);

´´´



## geocode api
https://console.developers.google.com/project
create a project, then
api & auth > geocoding api
follow the documentation at https://developers.google.com/maps/documentation/geocoding/