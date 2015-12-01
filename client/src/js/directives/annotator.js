'use strict';

/**
 * @ngdoc overview
 * @name histograph
 * @description
 * # histograph
 *
 * Main module of the application. require marked
 */
angular.module('histograph')
  /*
    Basic wrapper for ui-codemirror providing it with special hints, thanks to github.com/amarnus cfr.
    https://github.com/amarnus/ng-codemirror-dictionary-hint/blob/master/lib/ng-codemirror-dictionary-hint.js
  */
  .directive('mirror', function ($compile, $log) {
    return {
      restrict: 'A',
      priority: 2,
      compile: function compile() {
        return function postLink(scope, iElement, iAttrs) {
          var dictionary = [];
          
          // console.log(iAttrs);
          
          CodeMirror.registerHelper('hint', 'localHint', function (mirror, options) {
            CodeMirror.commands.autocomplete(mirror, function(editor, callback, options){
              var cur = editor.getCursor(),
                  curLine = editor.getLine(cur.line),
                  start = cur.ch,
                  end = start,
                  word = '',
                  tag  = '';
              
              // get last \w combination till last previous #
              while (start && /[#@\w-_$]+/.test(curLine.charAt(start - 1))) --start;
              
              tag = curLine.charAt(start);
              // 
              if(tag == '@') {
                // load user list
                callback({
                  list: ['@daniele', '@davide'],
                  from: CodeMirror.Pos(cur.line, start),
                  to: CodeMirror.Pos(cur.line, end)
                })
              } else if(tag == '#') {
                console.log(curLine.slice(start, end))
                
                // looking for a type, if there is a ':' sign for a person
                setTimeout(function(){ callback({
                    list: [
                      {
                        text: '#person'
                      },
                      { 
                        text: '#place'
                      },
                      ''
                    ],
                    from: CodeMirror.Pos(cur.line, start),
                    to: CodeMirror.Pos(cur.line, end)
                  })
                }, 100);
                
              } else {
                callback({
                  list: [],
                  from: CodeMirror.Pos(cur.line, start),
                  to: CodeMirror.Pos(cur.line, end)
                })
              }
            }, {
              async: true
            })
          });
          // The ui-codemirror directive allows us to receive a reference to the Codemirror instance on demand.
          scope.$broadcast('CodeMirror', function(cm) {
            cm.on('change', function(instance, change) {
              if (change.origin !== 'complete') {
                //console.log('Mirror, mirror', change)
                instance.showHint({ hint: CodeMirror.hint.localHint, completeSingle: false });
              }
            });
          });
        
        }
      }
    }
  })

  .directive('marked', function ($compile, $log) {
   return {
      restrict : 'A',
      scope:{
        marked: '=',
        context: '='
      },
      link : function(scope, element, attrs) {
        var entities = [],
            renderer = new marked.Renderer(),
            annotable = false;
        // chenge how marked interpred link for this special directive only
        renderer.link = function(href, title, text) {
          var localEntitiesIds = href.split(','),
              localEntities = [];
          
          localEntities = entities.filter(function (d) {
            return localEntitiesIds.indexOf(''+d.id) !== -1;
          })

          // it has been abandoned... sad
          if(!localEntities.length) {
            return text
          }
          // rewrite localentities better.
          return '<a tooltip-append-to-body="true" gasp-type="'+ 
            localEntities.map(function (d){
              return d.type
            }).join(',') +'" data-id="' +href +'" tooltip="' +
            localEntities.map(function (d) {
              return d.name || d.props.name
            }).join(' - ') + '">' + text + '</a>';
        };
        
        
        
        scope.$watch('marked', function(val) {
          if(!val)
            return;
          // organise(merge) entitites
          $log.log('::marked @marked changed');
          if(scope.context) {
            entities = scope.context.locations.concat(scope.context.persons)//, scope.context.organizations, scope.context.social_groups)
            
            element.html(marked(scope.marked, {
              renderer: renderer
            }));
          } else {
            element.html(marked(scope.marked));
          }
          // enable annotations
          

          
          //   

          // }
           console.log(attrs)
          // apply tooltip
          $compile(element.contents())(scope);
        });

        // add annotation capabilities on marked elements

      }
    }
  })

  .directive('annotator', function ($log) {
    return {
      restrict : 'E',
      
      link : function(scope, element, attrs) {
        $log.log('::annotator')
        Annotator.Plugin.HelloWorld = function (element) {
          return {
            pluginInit: function () { 
              console.log('qpifpoqifposdifposfipofdipo', this.annotator)
              this.annotator.subscribe("annotationCreated", function (annotation) {
                console.log("The annotation: %o has just been created!", annotation)
              })
              .subscribe("annotationUpdated", function (annotation) {
                console.log("The annotation: %o has just been updated!", annotation)
              })
              .subscribe("annotationDeleted", function (annotation) {
                console.log("The annotation: %o has just been deleted!", annotation)
              })
              .subscribe("annotationEditorShown", function (editor, annotation) {

                console.log("The annotation:  has just been annotationEditorShown!", arguments);
                scope.contribute(scope.item);
                scope.$apply();
              })
              .subscribe("annotationViewerShown", function (annotation) {
                console.log("The annotation: %o has just been annotationViewerShown!", annotation)
              })

            }
          };
        }

        var annotator = angular.element(element).annotator().data('annotator');
        annotator.addPlugin('Unsupported');
        annotator.addPlugin('HelloWorld');//' /*, any other options */);
        // element..annotator()bind('mouseup', function(e){
        //   var selection;

        //   if (window.getSelection) {
        //       selection = window.getSelection();
        //   } else if (document.selection) {
        //       selection = document.selection.createRange();
        //   }

        //   if (selection.toString() !== '') {
        //     var s = selection.toString();
        //     $log.log('::annotator -> ',selection)  
            
        //   }
        // });
        
      }
    }
  });
  
