/* globals d3, window */

// eslint-disable-next-line no-unused-vars
class TopicModellingTimeline {
  constructor(element, options = {}) {
    this.container = d3.select(element)
    this.svg = this.container.append('svg')
    if (options.class) {
      this.svg.attr('class', options.class)
    }
    if (options.extraFrequenciesLabel) {
      this.extraFrequenciesLabel = options.extraFrequenciesLabel
    }

    const { width, height } = this.container.node().getBoundingClientRect()
    if (width === 0) this._warn(`Width of the SVG container is ${width}`)
    if (height === 0) this._warn(`Height of the SVG container is ${height}`)

    this.data = {
      topicsScores: [],
      extraFrequencies: []
    }

    window.addEventListener('resize', () => {
      this.render.bind(this)
      if (options.onDesiredNumberOfTimestepsChange) {
        options.onDesiredNumberOfTimestepsChange(this.getDesiredNumberOfTimesteps())
      }
    })

    this.labelOffset = 30
    this.labelMargin = 5
  }

  // eslint-disable-next-line class-methods-use-this
  _warn(...args) {
    // eslint-disable-next-line no-console
    console.warn(...args)
  }

  getDesiredNumberOfTimesteps() {
    const width = this.container.node().clientWidth
    const paneWidth = width - this.labelMargin - this.labelOffset
    const minRadius = 20

    const val = Math.floor(paneWidth / minRadius)
    return val > 0 ? val : 0
  }

  render() {
    if (this.data.topicsScores.length === 0) return

    const dataLength = this.data.topicsScores.length
    const topicsCount = d3.max(this.data.topicsScores.map(i => i.length))

    const [width, height] = [
      this.container.node().clientWidth,
      this.container.node().clientHeight
    ]

    const frequenciesHeight = 64
    const separatorHeight = 8

    const containsExtraFrequencies = !!this.data.extraFrequencies

    const timelineHeight = containsExtraFrequencies
      ? height - frequenciesHeight - separatorHeight
      : height

    const maxCircleRadiusX = width / dataLength / 2
    const maxCircleRadiusY = timelineHeight / topicsCount / 2
    let maxCircleRadius = maxCircleRadiusX < maxCircleRadiusY
      ? maxCircleRadiusX : maxCircleRadiusY
    if (maxCircleRadius < 0) maxCircleRadius = 0

    const margin = {
      top: -10,
      right: 50,
      bottom: 10,
      left: 15
    }

    const xScale = d3.scaleLinear()
      .domain([0, dataLength])
      .rangeRound([margin.left, width - margin.right])

    const yScale = d3.scalePoint()
      .domain(d3.range(topicsCount))
      .rangeRound([margin.top, timelineHeight - margin.bottom])
      .padding(1)

    this.svg
      .attr('width', width)
      .attr('height', height)

    // Topic timeline
    if (!this._timelineContainer) {
      this._timelineContainer = this.svg
        .append('g')
        .attr('text-anchor', 'end')
        .style('font', '10px sans-serif')
    }

    this._timelineContainer
      .selectAll('text')
      .data(d3.transpose(this.data.topicsScores))
      .join('text')
      .attr('transform', (d, i) => `translate(0, ${yScale(i)})`)
      .attr('dy', '0.35em')
      .attr('x', xScale(0) + this.labelOffset)
      .text((d, i) => `Topic ${i + 1}`)

    if (!this._timestepsContainer) {
      this._timestepsContainer = this.svg.append('g')
    }

    const timestepContainer = this._timestepsContainer
      .selectAll('g')
      .data(this.data.topicsScores)
      .join('g')
      .attr('transform', (d, i) => `translate(${xScale(i) + this.labelOffset + this.labelMargin + maxCircleRadius}, 0)`)

    timestepContainer
      .selectAll('line')
      .data([null])
      .join('line')
      .attr('stroke', '#fafafa')
      .attr('x', maxCircleRadius)
      .attr('y1', yScale(0))
      .attr('y2', height)

    timestepContainer.selectAll('circle')
      .data(d => {
        const std = d3.deviation(d)
        const mean = d3.mean(d)
        return d.map(val => ({ val, mean, std }))
      })
      .join('circle')
      .attr('cy', (d, i) => yScale(i))
      .attr('fill', d => this._getColour(d))
      .attr('r', d => (parseFloat(d.val) > 0 ? d.val * maxCircleRadius : 0))

    // divider
    if (!this._divider) {
      this._divider = this.svg
        .append('line')
        .attr('stroke', '#bbb')
        .attr('stroke-dasharray', 4)
    }
    this._divider.attr('x1', 0)
      .attr('x2', width)
      .attr('transform', () => `translate(0, ${timelineHeight + separatorHeight / 2})`)
      .attr('display', containsExtraFrequencies ? undefined : 'none')

    if (!this._extraFrequenciesContainer) {
      this._extraFrequenciesContainer = this.svg.append('g')
    }

    // extra frequencies
    const extraFrequenciesMargin = 2
    let barWidth = maxCircleRadius * 2 - extraFrequenciesMargin
    if (barWidth < 0) barWidth = 0

    this._extraFrequenciesContainer
      .attr('transform', `translate(${this.labelOffset + this.labelMargin}, ${height - frequenciesHeight})`)
      .selectAll('rect')
      .data(this.data.extraFrequencies || [])
      .join('rect')
      .attr('x', (d, i) => xScale(i) + extraFrequenciesMargin / 2)
      .attr('y', d => frequenciesHeight - d * frequenciesHeight)
      .attr('width', barWidth)
      .attr('height', d => d * frequenciesHeight)
      .attr('fill', '#99999977')
      .attr('display', containsExtraFrequencies ? undefined : 'none')

    if (!this._extraFrequenciesLabel) {
      this._extraFrequenciesLabel = this.svg.append('text')
    }
    this._extraFrequenciesLabel
      .attr('transform', `translate(0, ${timelineHeight + separatorHeight * 2})`)
      .attr('x', xScale(0) + this.labelOffset)
      .attr('text-anchor', 'end')
      .style('font', '10px sans-serif')
      .attr('dx', '0.35em')
      .text(this.extraFrequenciesLabel || '')
      .attr('display', containsExtraFrequencies ? undefined : 'none')
  }

  // eslint-disable-next-line class-methods-use-this
  _getColour(d) {
    // eslint-disable-next-line no-restricted-globals
    if (isNaN(d.val)) return '#ffffffff'
    const [colourA, colourB, colourNeutral] = ['#00ff33', '#ff0000', '#eeeeee']
    const colour = (() => {
      if (d.val > d.mean + d.std) return colourA
      if (d.val < d.mean - d.std) return colourB
      return colourNeutral
    })()
    let sval = Math.abs(d.val - d.mean) * 2
    if (sval > 1) sval = 1.0
    if (sval < 0) sval = 0.0
    const opacity = (55 + Math.round(sval * 200)).toString(16)
    return colour + (opacity.length === 1 ? `0${opacity}` : opacity)
  }

  /**
   * Example:
   * `
   * {
   *   "topicsScores": [ // 3 topics per each timestep
   *     [0.3, 0.5, .234], // time step 0
   *     [0.3, 0.5, .234], // time step 1
   *     ...
   *   ],
   *   "extraFrequencies": [ // must have the same length as "topicScores"
   *     0.1, // step 0
   *     0.9, // step 1
   *     ...
   *   ]
   * }
   * `
   * @param {object} data topics scores and optional extra frequencies data.
   */
  setData(data, options = {}) {
    this.data = data

    if (options.extraFrequenciesLabel) {
      this.extraFrequenciesLabel = options.extraFrequenciesLabel
    }

    this.render()
  }
}
