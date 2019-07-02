/**

  List of dependencies for css and for js
  Cfr. gulpfile.js
  ===
*/
module.exports = {
  production: {
    scripts: [
      '/js/scripts.min.js'
    ]
  },
  development: {
    scripts: [
      '/js/lib/jquery-2.1.3.min.js', 
      '/js/lib/d3.min.js',
      '/js/lib/lodash.min.js', 
      '/js/lib/marked.min.js',
      // '/js/lib/codemirror.js',
      // '/js/lib/codemirror-addon-simple.js',
      // '/js/lib/codemirror-addon-show-hint.js',

      '/js/lib/masonry.pkgd.min.js',
      '/js/lib/imagesloaded.pkgd.min.js',

      '/js/lib/annotator.min.js',
      // '/js/lib/annotorious.min.js',
      // '/js/lib/annotorious-merge.js',   
      
      '/js/lib/moment.min.js',
      '/js/lib/sigma.min.js',
      '/js/lib/sigma.layout.forceAtlas2.min.js',
      '/js/lib/sigma.plugins.dragNodes.js',
      '/js/lib/sigma.exporters.svg.js',
      //-   '/js/lib/sigma.statistics.HITS.js',
      '/js/lib/perfect-scrollbar.min.js',
      '/js/lib/perfect-scrollbar.with-mousewheel.min.js',
      '/js/lib/angular.min.js',
      '/js/lib/angular-ui-router.min.js',  
      '/js/lib/angular-route.min.js',
      '/js/lib/angular-resource.min.js',
      '/js/lib/angular-cookies.min.js',
      '/js/lib/angular-sanitize.min.js',
      '/js/lib/angular-local-storage.min.js',

      // google analytics
      '/js/lib/angular-google-analytics.min.js',

      // translation mechanism
      '/js/lib/angular-translate.min.js',
      '/js/lib/angular-translate-loader-static-files.min.js',

      // masonry: reesources as bricks
      '/js/lib/angular-masonry.min.js',
      
      // angular guided tour, by daft-monk
      '/js/lib/angular-tour-tpls.min.js',  

      // '/js/lib/ui-codemirror.min.js',

      // '/js/lib/openlayers.min.js',

      //-   '/js/lib/angular-strap.min.js',
      //-   '/js/lib/angular-strap.tpl.min.js',
      // '/js/lib/ui-bootstrap-tpls.min.js',
      '/js/lib/ui-bootstrap.min.js',
      '/js/lib/ui-bootstrap-tpls.min.js',
      '/js/lib/angular-perfect-scrollbar.js',

      '/js/lib/leaflet.js',
      '/js/lib/leaflet-iiif.js',

      '/js/app.js',
      '/js/services.js',
      '/js/filters.js',
      '/js/templates.js',

      '/js/controllers/core.js',
      '/js/controllers/filters.js',

      '/js/controllers/all-in-between.js',
      '/js/controllers/all-shortest-paths.js',
      '/js/controllers/collection.js',
      '/js/controllers/crowd.js',
      '/js/controllers/entity.js',
      '/js/controllers/graph.js',
      '/js/controllers/guided-tour.js',
      '/js/controllers/index.js',
      '/js/controllers/inquiry.js',
      '/js/controllers/issue.js',
      '/js/controllers/neighbors.js',
      '/js/controllers/projection.js', 
      '/js/controllers/pulse.js',
      '/js/controllers/resource.js',
      '/js/controllers/search.js',
      '/js/controllers/user.js',

      // modal controllers. templates in templates/modal
      '/js/controllers/modals/contribute.js',
      '/js/controllers/modals/create-entity.js',
      '/js/controllers/modals/inspect.js',


      '/js/directives/annotator.js', 
      '/js/directives/annotorious.js', 
      '/js/directives/sigma.js',  
      '/js/directives/snippets.js', 
      '/js/directives/timeline.js',
      '/js/directives/reporter.js',
      '/js/directives/popit.js',
      '/js/directives/lazy-text.js',
      '/js/directives/iiifImage.js',
    ]
  }
};