'use strict';

/**
 * @ngdoc overview
 * @name histograph
 * @description
 * # histograph
 *
 * Main module of the application.
 */
angular.module('histograph')
  .directive('annotorious', function() {
    return {
      restrict : 'A',
      scope: {
        width: '=w',
        height: '=h',
        version: '=', // which annotation version do you want to see here?
        tiles : '=', // has it openlayers tiles?
        contribute: '&', // open contribution dialogue
        item: '='
      },
      link : function(scope, element) {
        // Add the plugin like so
        anno.addPlugin('AnnotoriousBridge', {
          onEditorShown: function(annotation){
            console.log(annotation)
            
            scope.contribute({
              item: scope.item, 
              type: "entity", 
              options: {
              }
            });
            scope.$apply();
          }
        });
        /* draw the current annotation version */
        var src = '';
        /*
          draw the corresponding annotation to annotorious
        */
        var draw = function (ver) {
          anno.removeAll();
          console.log('drqw version', ver, src)
          for(var i in ver.yaml) {
            // trznsform pixel to %
            var geometry = {
              x: ver.yaml[i].region.left/(+scope.width),
              y: ver.yaml[i].region.top/(+scope.height),
              
              width: 0.1,
              height: 0.1,
            };
            geometry.width = -geometry.x + ver.yaml[i].region.right/(+scope.width);
            geometry.height = -geometry.y + ver.yaml[i].region.bottom/(+scope.height);
            // console.log(geometry, ver.yaml[i].identification, src)
            anno.addAnnotation({
              src: src,
              text : ver.yaml[i].identification || '',
              shapes : [{
                type : 'rect',
                geometry : geometry
              }]
            })
          }

          if(ver.service == 'merged') {
            try {
              anno.addPlugin('Merge', {src: src});
            } catch(e){
              console.log(e)
            }
          }
        };

        

        scope.$watch('version', function (ver) {
          console.log('::annotorious @version', ver, 'has tiles?', scope.tiles)
          if(!ver)
            return;
          console.log('versio', element)
          if(!element[0].complete) {
            src = element[0].src;
            element.bind("load" , function (e) { 
              anno.makeAnnotatable(this);
              draw(ver);
            });
          } else {
            src = element[0].src;
            anno.makeAnnotatable(element[0]);
            draw(ver)
          };
        });
      }
    };
  })
  /*
    Annotorious with openlayers.
  */
  .directive('annotoriousol', function() {
    return {
      restrict : 'A',
      scope: {
        tiles : '=' // has it openlayers tiles?
      },
      link : function(scope, element) {
        element.height(500);
        // var options =
        //   { maxExtent: new OpenLayers.Bounds(0, 0, 1475, 1184),
        //     maxResolution: 8,
        //     numZoomLevels: 2,
        //     units: 'pixels' };

        // var map = new OpenLayers.Map(element[0], options);
        // var baseLayer = new OpenLayers.Layer.TMS("Baselayer", scope.tiles + '/',
        //   { layername: ".",
        //     serviceVersion: ".",
        //     transitionEffect: "resize",
        //     type:"jpg" });

        // map.addLayer(baseLayer);
        // map.zoomToMaxExtent();
        // anno.makeAnnotatable(map);
      }
    };
  });


annotorious.plugin.AnnotoriousBridge = function(options) { 
  this.initPlugin = function(anno) {
    // Add initialization code here, if needed (or just skip this method if not)
    ['onEditorShown'].forEach(function (d) {
      if(typeof options[d] == 'function')
        anno.addHandler(d, options[d])
    });
  }
};
