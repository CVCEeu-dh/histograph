

## installation
npm install


npm test

in order to test recognition api, please add two jpg file inside the test folder
test.jpg
test-single.jpg


## dealing with migration
- truncate neo4j db
- create media entry
 
	
	npm run-script migrate


## typekit
´´´javascript
<script>
  (function(d) {
    var config = {
      kitId: 'fwe7tir',
      scriptTimeout: 3000
    },
    h=d.documentElement,t=setTimeout(function(){h.className=h.className.replace(/\bwf-loading\b/g,"")+" wf-inactive";},config.scriptTimeout),tk=d.createElement("script"),f=false,s=d.getElementsByTagName("script")[0],a;h.className+=" wf-loading";tk.src='//use.typekit.net/'+config.kitId+'.js';tk.async=true;tk.onload=tk.onreadystatechange=function(){a=this.readyState;if(f||a&&a!="complete"&&a!="loaded")return;f=true;clearTimeout(t);try{Typekit.load(config)}catch(e){}};s.parentNode.insertBefore(tk,s)
  })(document);
</script>
´´´