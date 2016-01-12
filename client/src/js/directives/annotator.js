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
          return '<a  gasp-type="'+ 
            localEntities.map(function (d){
              return d.type
            }).join(',') +'" data-id="' +href +'"  gasp-parent="resource-'+ 
            scope.context.id + '">' + text + '</a>';
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
           // console.log(attrs)
          // apply tooltip
          $compile(element.contents())(scope);
        });

        // add annotation capabilities on marked elements

      }
    }
  })

  .directive('typeaheadTriggerOnModelChange', function($timeout) {
    return {
      require: 'ngModel',
      link: function (scope, element, attr, ctrl) {
        scope.$watch(attr.typeaheadTriggerOnModelChange, function(v){
          if(!v) // and v !=some previous value
            return;
          console.log('::typeaheadTriggerOnModelChange @',attr.typeaheadTriggerOnModelChange, v);
          ctrl.$setViewValue('');
          $timeout(function() {
            ctrl.$setViewValue(v);
          });
        });
        
      } 
    }
  })

  /*
    
  */
  .directive('annotator', function ($log) {
    return {
      restrict : 'E',
      link : function(scope, element, attrs) {
        $log.log('::annotator');



        var annotator = angular.element(element).annotator().data('annotator');

        
        annotator.addPlugin('Unsupported');
        annotator.addPlugin('HelloWorld', {
          annotationEditorShown: function(annotation, annotator) {
            
            scope.contribute(scope.item, "entity", {
              context: attrs.context,
              language: scope.language,
              query: annotation.quote,
              annotator: annotator,
              submit: function(annotator, result) {
                annotator.editor.submit();
              },
              discard: function(annotator) {
                annotator.editor.hide();
              }
            });
            scope.$apply();
          }
        });
        annotator.publish('resize')
        
        // lazyload annotation for this specific  element
        if(!scope.loadAnnotations)
          return;
        setTimeout(function(){
          scope.loadAnnotations({
            context: attrs.context,
            language: scope.language
          }, function (annotations) {
            debugger
            annotator.loadAnnotations(annotations);
          });
        }, 20);
      }
    }
  });
  
Annotator.Plugin.HelloWorld = function (element, options) {
  return {
    pluginInit: function () { 
      var editor,
          annotator = this.annotator,
          link;
      console.log('HelloWorld', options);

      this.annotator.viewer.addField({
        load: function (field, annotation) {
          // console.log(annotation);

          field.innerHTML = annotation.mentions.map(function(d){
            console.log(d)
            field.className = 'custom';
            var html = '';

            if(d.type == 'person')
              html = '' +
              '<div class="node '+ d.type + '">' + 
                '<div class="thumbnail"><div class="thumbnail-wrapper" style="background-image: url(' + d.props.thumbnail + ')"></div></div>' +
                '<div class="content tk-proxima-nova"><h4><a class="tk-proxima-nova">' + d.props.name + '</a></h4> ' + d.props.description + '</div>' + 
              '</div>';

             if(d.type == 'location')
              html = '' + 
              '<div class="node '+ d.type + '">' + 
                '<div class="content tk-proxima-nova"><h4><a class="tk-proxima-nova">' + d.props.name + (d.props.country?'('+d.props.country + ')':'')+'</a></h4> ' + d.props.type + '</div>' + 
              '</div>';

            return html;


          }).join('-') 
        }
      });

      this.annotator.viewer.addField({
        load: function (field, annotation) {
          // console.log(annotation)
          field.className = 'author custom';
          field.innerHTML = annotation.author.username;
        }
      })

      this.annotator.subscribe('resize', function() {
        
      });

      this.annotator.subscribe("annotationCreated", function (annotation) {
        console.log("The annotation: %o has just been created!", annotation, link)
      })
      .subscribe("annotationUpdated", function (annotation) {
        console.log("The annotation: %o has just been updated!", annotation)
      })
      .subscribe("annotationDeleted", function (annotation) {
        console.log("The annotation: %o has just been deleted!", annotation)
        if(editor)
          editor.hide()
      })
      .subscribe("annotationEditorShown", function (editor, annotation) {
        editor = editor;
        console.log("The annotation:  has just been annotationEditorShown!", arguments, annotator);
        
        if(typeof options.annotationEditorShown == 'function')
          options.annotationEditorShown(annotation, annotator)
      })
      .subscribe("annotationViewerShown", function (viewer) {
        //console.log("The annotation: %o has just been annotationViewerShown!", annotation, annotator.wrapper.width());
        var w = annotator.wrapper.width(),
            l = parseInt((viewer.element[0].style.left || 0).replace(/[^0-9-]/g,'')),
            d = w - l;
        // console.log('annotationViewerShown', d, viewer.element[0].style.left)
        if(d < 280){
          viewer.element[0].style.left =  (l - 280 + d) + 'px';
        }
          // console.log('d is ', d, (l - 280 + d))
        // viewer.element[0].style.left = d < 280? (viewer.element[0].style.left - 280 + d) +'px': viewer.element[0].style.left;
        // console.log(w,d,viewer.element[0].offsetLeft, annotator)
      })

    }
  };
};