/* eslint-env browser */
/* globals angular, d3, _ */
/**
 * @ngdoc overview
 * @name histograph
 * @description
 * # histograph
 *
 * directive to show a grapgh of nodes and edges thanks to @Yomguithereal!!!
 */
angular.module('histograph')
  // eslint-disable-next-line prefer-arrow-callback
  .directive('timeline', function directive($log, $window, $location) {
    return {
      restrict: 'A',
      scope: {
        timeline: '=t',
        contextualTimeline: '=cxt',
        filters: '='
      },
      template: '<div class="brushdate left tk-proxima-nova"></div><div class="brushdate right tk-proxima-nova"></div><div class="date left tk-proxima-nova"></div><div class="date right tk-proxima-nova"></div><div class="mouse tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div><div class="viewer"></div>',
      // eslint-disable-next-line prefer-arrow-callback
      link: function link(scope) {
        /*
          Timeline config
          ---
        */
        const tim = {
          css: {},
          fn: {
            asDay: d3.timeFormat('%B %d, %Y'),
            asMonth: d3.timeFormat('%Y-%m'),
            asYear: d3.timeFormat('%Y')
          },
          padding: {
            v: 10,
            h: 10
          },
          dimensions: {
            w: 1000,
            h: 50
          },
          _width: 0,
          _height: 50,
          ui: {}
        }

        // set/get timeline width
        tim.width = v => {
          if (!v) return tim._width
          tim._width = v
          return tim
        }

        tim.height = v => {
          if (!v) return tim._height
          tim._height = v
          return tim
        }

        tim.init = () => {
          $log.log('::timeline -> init() ')

          tim.ui.viewer = d3.select('#timeline .viewer')
          tim.ui.tooltip = d3.select('#timeline .tooltip')
          tim.ui.tooltipText = d3.select('#timeline .tooltip-inner')
          tim.ui.dateLeft = d3.select('#timeline .date.left')
          tim.ui.dateRight = d3.select('#timeline .date.right')
          tim.ui.brushDateLeft = d3.select('#timeline .brushdate.left')
          tim.ui.brushDateRight = d3.select('#timeline .brushdate.right')

          tim.brush = d3.brushX()

          tim.width(tim.ui.viewer.node().clientWidth)

          tim.svg = tim.ui.viewer
            .append('svg')
            .attr('height', tim.height())
            .attr('width', tim.width())

          tim.histograms = tim.svg.append('g')
            .attr('class', 'histograms')
            .attr('transform', `translate(${tim.padding.v},${tim.padding.h})`)

          tim.stream = tim.svg.append('path')
            .attr('transform', `translate(${tim.padding.v},${tim.padding.h})`)
            .attr('class', 'stream')

          tim.ui.pointer = tim.svg.append('rect')
            .attr('height', tim.dimensions.h)
            .attr('width', 1)
            .attr('fill', 'magenta')
            .style('opacity', 0)

          tim.context = tim.svg.append('g')
            .attr('class', 'context')
            .attr('transform', `translate(${tim.padding.v},${tim.padding.h / 2})`)

          tim.gBrush = tim.context.append('g')
            .attr('class', 'x brush')
            .call(tim.brush.extent([
              [-1, 0],
              [tim.width() - tim.padding.v * 2 + 2, tim.height() - tim.padding.h]
            ]))

          if (tim.drawDates) tim.drawDates()

          tim.initFn()
          tim.initHandlers()
        }

        tim.initFn = () => {
          $log.log('::timeline -> initFn() ')
          tim.fn.x = d3.scaleTime()
            .range([
              tim.padding.h * 2,
              tim._width - tim.padding.h * 2
            ]).domain([
              0,
              100
            ])

          tim.fn.y = d3.scaleSqrt()
            .range([
              10,
              50
            ])

          tim.fn.color = d3.scaleSqrt()
            .range([
              '#ccc', '#151515'
            ])

          tim.fn.fcolor = d3.scaleSqrt()
            .range([
              '#AB2211', '#FF5742'
            ])

          tim.fn.fy = d3.scaleSqrt()
            .range([
              20,
              50
            ])

          // tim.fn.area = d3.svg.area()
          //     //.interpolate("monotone")
          //     .x(function (d) {
          //       return tim.fn.x(d.t);
          //     })
          //     .y0(function (d) {
          //       return tim.fn.y(d.weight);
          //     })
          //     .y1(30);
        }

        tim.drawDates = extent => {
          // $log.log('::timeline -> drawDates() ', extent);
          if (!extent) {
            tim.ui.brushDateLeft.style('visibility', 'hidden')
            tim.ui.brushDateRight.style('visibility', 'hidden')
            return
          }
          if (extent[0] && typeof extent[0] === 'object') {
            // console.log(extent[0])
            tim.ui.brushDateLeft
              .style('visibility', 'visible')
              .style('transform', `translateX(${tim.fn.x(extent[0]) + 50 - 1}px)`)
              .text(tim.fn.asDay(extent[0]))
          } else if (typeof extent[0] === 'number') {
            tim.ui.brushDateLeft
              .style('visibility', 'visible')
              .style('transform', `translateX(${tim.fn.x(extent[0]) + 50 - 1}px)`)
              .text(tim.fn.asDay(new Date(extent[0])))
          } else {
            tim.ui.brushDateLeft.style('visibility', 'hidden')
          }

          if (typeof extent[1] === 'object') {
            tim.ui.brushDateRight
              .style('visibility', 'visible')
              .style('transform', `translateX(${tim.fn.x(extent[1]) + 110 + 51}px)`)
              .text(tim.fn.asDay(extent[1]))
          } else if (typeof extent[1] === 'number') {
            tim.ui.brushDateRight
              .style('visibility', 'visible')
              .style('transform', `translateX(${tim.fn.x(extent[1]) + 110 + 51}px)`)
              .text(tim.fn.asDay(new Date(extent[1])))
          } else {
            tim.ui.brushDateRight.style('visibility', 'hidden')
          }
        }

        tim.initHandlers = () => {
          $log.log('::timeline -> initHandlers() ')

          // update date left and right positioning
          tim.brush.on('brush', () => {
            const extent = d3.event.selection
              ? d3.event.selection.map(tim.fn.x.invert)
              : undefined
            tim.drawDates(extent)
          })

          tim.brush.on('end', () => {
            if (!d3.event.sourceEvent) return // Only transition after input.
            if (!d3.event.selection) {
              $log.log('::timeline @brushend, click on the timeline just clear the things')
              tim.fn.clear(true)

              $location.search(angular.extend($location.search(), {
                from: null,
                to: null
              }))
              scope.$applyAsync()

              return
            }

            const extent = d3.event.selection.map(tim.fn.x.invert)
            const [left, right] = extent

            $log.log('::timeline @brushend - left:', left, '- right:', right)

            // extent cover the whole timespan
            if (left.getTime() <= tim.timeExtent[0] && right.getTime() >= tim.timeExtent[1]) {
              $log.log('::timeline @brushend, maximum timespan, clear filters')
              tim.fn.clear()

              $location.search(angular.extend($location.search(), {
                from: null,
                to: null
              }))
              scope.$applyAsync()

              return
            }
            $log.log('::timeline @brushend, visualize dates')

            // check whether the labels should be shown
            tim.drawDates(extent)

            clearTimeout(tim.brushTimer)
            tim.brushTimer = setTimeout(() => {
              if (typeof extent[0] === 'object') {
                const previous = $location.search()

                $location.search(angular.extend(previous,
                  extent[0] ? {
                    from: d3.timeFormat('%Y-%m-%d')(extent[0])
                  } : {},
                  extent[1] ? {
                    to: d3.timeFormat('%Y-%m-%d')(extent[1])
                  } : {}))
                scope.$applyAsync()
              }
            }, 10)

            // console.log("brushing babe", tim.brush.extent())
          })

          tim.svg.on('mouseover', () => {
            tim.ui.tooltip.style('opacity', 1)
            tim.ui.pointer.style('opacity', 1)
          })

          tim.svg.on('mouseout', () => {
            tim.ui.tooltip.style('opacity', 0)
            tim.ui.pointer.style('opacity', 0)
          })

          tim.svg.on('mousemove', function onMouseMove() {
            const pos = d3.mouse(this)

            const date = new Date(tim.fn.x.invert(pos[0] - tim.padding.v))

            tim.ui.pointer
              .style('opacity', pos[0] < tim.padding.v || pos[0] > tim.width() - tim.padding.v ? 0 : 1)
              .attr('x', pos[0])
            tim.ui.tooltip
              .style('transform', `translateX(${pos[0] + 150}px)`)
              .style('opacity', pos[0] < tim.padding.v || pos[0] > tim.width() - tim.padding.v ? 0 : 1)
            tim.ui.tooltipText.text(
              tim.fn.asDay(date)
            )
          })
        }

        // evaluate initial filters
        tim.evaluate = () => {
          if (!tim.timeExtent) { return false }

          // evaluate scope .filters against the current timeExtension and
          // decide if there is the need for updating
          const left = scope.filters.from && scope.filters.from.length ? d3.timeParse('%Y-%m-%d')(scope.filters.from[0]).getTime() : tim.timeExtent[0]
          const right = scope.filters.to && scope.filters.to.length ? d3.timeParse('%Y-%m-%d')(scope.filters.to[0]).getTime() : tim.timeExtent[1]

          const proceed = left !== tim.left || right !== tim.right

          tim.left = left
          tim.right = right
          $log.log('::timeline -> evaluate() - tochange:', proceed)
          return proceed
        }

        tim.fn.clear = ignoreBrush => {
          $log.log('::timeline -> clear()')
          tim.drawDates()
          if (!ignoreBrush) tim.gBrush.call(tim.brush.move)
        }

        tim.resize = () => {
          clearTimeout(tim.resizeTimer)
          const isResizeNeeded = tim.width() !== tim.ui.viewer.node().clientWidth
          $log.log('::timeline @resize: ', isResizeNeeded ? 'resize!' : 'do not resize')
          if (isResizeNeeded) {
            tim.width(tim.ui.viewer.node().clientWidth)
            // reset ranges according to width
            tim.svg.attr('width', tim.width())
            tim.resizeTimer = setTimeout(tim.drawCtx, 200)
          }
        }

        tim.draw = () => {
          clearTimeout(tim.resizeTimer)
          if (!tim.ui.viewer || !scope.timeline || !scope.contextualTimeline) { return }
          // tim.width(tim.ui.viewer.node().clientWidth);

          // sameWeigthExtent, // when min and max have the same values.

          // let timeExtent // [minT, maxT] array of max and min timestamps

          const dataset = angular.copy(_.flatten([scope.timeline])).map(d => {
            const dNew = angular.copy(d)
            dNew.t *= 1000 // different level of aggregation
            return dNew
          })

          $log.log('::timeline -> draw() - w:', tim.width(), '- n. values:', dataset.length)

          const weigthExtent = d3.extent(dataset, (d) => d.weight)

          tim.fn.fcolor.domain(weigthExtent)
          tim.fn.fy.domain(weigthExtent)

          // console.log('    weightext: ', weigthExtent, tim.fn.fcolor(5), tim.fn.fcolor(100))

          // sort by time label
          dataset.sort((a, b) => (a.t < b.t ? -1 : 1))

          tim.histograms
            .selectAll('.tn')
            .data(dataset, d => d.k || d.t)
            .join('rect')
            .attr('class', 'tn')
            .attr('x', d => tim.fn.x(d.t))
            .attr('y', d => 15 - (tim.fn.fy(d.weight) / 2))
            .attr('width', 1)
            .attr('height', d => tim.fn.fy(d.weight))
            .attr('fill', d => tim.fn.fcolor(d.weight))
        }

        tim.drawCtx = () => {
          clearTimeout(tim.resizeTimer)
          if (!tim.ui.viewer || !scope.contextualTimeline) { return }

          tim.width(tim.ui.viewer.node().clientWidth)

          // let timeExtent // [minT, maxT] array of max and min timestamps


          const dataset = angular.copy(_.flatten([scope.contextualTimeline])).map((d) => {
            const newD = angular.copy(d)
            newD.t *= 1000 // different level of aggregation
            return newD
          })

          $log.log('::timeline -> drawCtx() - w:', tim.width(), '- n. values:', dataset.length)

          // time extent
          tim.timeExtent = d3.extent(dataset, (d) => d.t)

          // weight extent
          const weigthExtent = d3.extent(dataset, (d) => d.weight)

          // sort by time label
          dataset.sort((a, b) => (a.t < b.t ? -1 : 1))

          // set date from extent
          tim.ui.dateLeft
            .text(tim.fn.asDay(new Date(tim.timeExtent[0])))
          tim.ui.dateRight
            .text(tim.fn.asDay(new Date(tim.timeExtent[1])))


          tim.fn.x = d3.scaleTime()
            .range([0, tim.width() - tim.padding.h * 2])

          tim.fn.x.domain(tim.timeExtent)
          tim.fn.y.domain(weigthExtent)
          tim.fn.color.domain(weigthExtent)

          // console.log('::timeline -> drawCtx(): weight',
          // weigthExtent, tim.fn.color(5), tim.fn.color(100))
          // console.log('::timeline -> drawCtx(): timeExtent', tim.timeExtent)

          if (tim.evaluate()) {
            if (tim.left <= tim.timeExtent[0] && tim.right >= tim.timeExtent[1]) {
              tim.gBrush.call(tim.brush.move)
            } else {
              const c = [tim.left, tim.right].map(tim.fn.x)
              tim.gBrush.call(tim.brush.move, c)
            }
          }

          // move brush
          // tim.drawDates()

          // let's draw !!!
          tim.histograms
            .selectAll('.t')
            .data(dataset, d => d.k || d.t)
            .join('rect')
            .attr('class', 't')
            .attr('x', d => tim.fn.x(d.t))
            .attr('y', 10)
            .attr('width', 2)
            .attr('height', 10)
            .attr('fill', d => tim.fn.color(d.weight))

          if (scope.timeline) { tim.draw() } // draw or redraw
        }

        /*
          Listeners, watchers
        */
        /*
          @timeline
          if timeline values has changed, for some reason
        */
        scope.$watch('timeline', timeline => {
          if (!timeline || timeline.length === undefined) { return }
          $log.log('::timeline @timeline n. nodes ', timeline.length)
          tim.draw()
        })

        /*
          @contextualTimeline
          Draw the background timeline (context)
          normally called once
        */
        scope.$watch('contextualTimeline', contextualTimeline => {
          if (!contextualTimeline || contextualTimeline.length === undefined) { return }
          $log.log('::timeline @contextualTimeline n. nodes ', contextualTimeline.length)
          tim.drawCtx()
        })

        /*
          @filters
        */
        scope.$watch('filters', () => {
          if (tim.evaluate()) {
            if (tim.left <= tim.timeExtent[0] && tim.right >= tim.timeExtent[1]) {
              tim.gBrush.call(tim.brush.move)
            } else {
              const c = [tim.left, tim.right].map(tim.fn.x)
              tim.gBrush.call(tim.brush.move, c)
            }
          }
        })
        /*
          listen to resize window event
        */
        angular.element($window).bind('resize', tim.resize)

        tim.init()
      }
    }
  })
