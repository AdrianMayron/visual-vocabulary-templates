/**
 * Bootstrapping code for line chart
 */

import * as d3 from 'd3';
import gChartframe from 'g-chartframe';
import gChartcolour from 'g-chartcolour';
import * as parseData from './parseData.js';
import * as cartogram from './drawChart.js';
import * as ss from 'simple-statistics';
import * as gLegend from 'g-legend';



const dataFile = 'results.csv';
const shapefile = 'choropleth.json';
const regionsfile = 'uk-regions.json';
const scaleType = 'political' //linear, jenks or manual sets the type of colour scale
const legendAlign = 'vert'; // hori or vert, alignment of the legend
const legendType = 'rect'; // rect, line or circ, geometry of legend marker

const dateFormat = '%d/%m/%Y';
/*
  some common formatting parsers....
  '%m/%d/%Y'        01/28/1986
  '%d-%b-%y'        28-Jan-86
  '%Y %b'           1986 Jan
  '%Y-%m-%d'        1986-01-28
  '%B %d'           January 28
  '%d %b'           28 Jan
  '%H:%M'           11:39
  '%H:%M %p'        11:39 AM
  '%d/%m/%Y %H:%M'  28/01/2016 11:39
*/

const sharedConfig = {
    title: 'Results summary',
    subtitle: 'By constituency',
    source: 'Source: Not yet added',
};
//Defines the scale from the g-chartcolour library when using the jenks calculation
const ftColorScale = 'sequentialSingle'

//Imput values into the domain of this scale to create manual scale breaks
let colorScale = d3.scaleThreshold()
  .domain([0.1, 0.2, 0.4, 0.5, 0.6,])
  .range(['#F3DEC8', '#CEBFAB', '#A9A18F', '#848273', '#5F6456', '#3A453A', '#3A453A']);

ss.jenksMatrices = function (data, n_classes) {

  // in the original implementation, these matrices are referred to
  // as `LC` and `OP`
  //
  // * lower_class_limits (LC): optimal lower class limits
  // * variance_combinations (OP): optimal variance combinations for all classes
  var lower_class_limits = [],
    variance_combinations = [],
    // loop counters
    i, j,
    // the variance, as computed at each step in the calculation
    variance = 0;

  // Initialize and fill each matrix with zeroes
  for (i = 0; i < data.length + 1; i++) {
    var tmp1 = [], tmp2 = [];
    for (j = 0; j < n_classes + 1; j++) {
      tmp1.push(0);
      tmp2.push(0);
    }
    lower_class_limits.push(tmp1);
    variance_combinations.push(tmp2);
  }

  for (i = 1; i < n_classes + 1; i++) {
    lower_class_limits[1][i] = 1;
    variance_combinations[1][i] = 0;
    // in the original implementation, 9999999 is used but
    // since Javascript has `Infinity`, we use that.
    for (j = 2; j < data.length + 1; j++) {
      variance_combinations[j][i] = Infinity;
    }
  }

  for (var l = 2; l < data.length + 1; l++) {

    // `SZ` originally. this is the sum of the values seen thus
    // far when calculating variance.
    var sum = 0,
      // `ZSQ` originally. the sum of squares of values seen
      // thus far
      sum_squares = 0,
      // `WT` originally. This is the number of 
      w = 0,
      // `IV` originally
      i4 = 0;

    // in several instances, you could say `Math.pow(x, 2)`
    // instead of `x * x`, but this is slower in some browsers
    // introduces an unnecessary concept.
    for (var m = 1; m < l + 1; m++) {

      // `III` originally
      var lower_class_limit = l - m + 1,
        val = data[lower_class_limit - 1];

      // here we're estimating variance for each potential classing
      // of the data, for each potential number of classes. `w`
      // is the number of data points considered so far.
      w++;

      // increase the current sum and sum-of-squares
      sum += val;
      sum_squares += val * val;

      // the variance at this point in the sequence is the difference
      // between the sum of squares and the total x 2, over the number
      // of samples.
      variance = sum_squares - (sum * sum) / w;

      i4 = lower_class_limit - 1;

      if (i4 !== 0) {
        for (j = 2; j < n_classes + 1; j++) {
          if (variance_combinations[l][j] >=
            (variance + variance_combinations[i4][j - 1])) {
            lower_class_limits[l][j] = lower_class_limit;
            variance_combinations[l][j] = variance +
              variance_combinations[i4][j - 1];
          }
        }
      }
    }

    lower_class_limits[l][1] = 1;
    variance_combinations[l][1] = variance;
  }

  return {
    lower_class_limits: lower_class_limits,
    variance_combinations: variance_combinations
  };
};

ss.jenks = function (data, n_classes) {

  // sort data in numerical order
  data = data.slice().sort(function (a, b) { return a - b; });

  // get our basic matrices
  var matrices = ss.jenksMatrices(data, n_classes),
    // we only need lower class limits here
    lower_class_limits = matrices.lower_class_limits,
    k = data.length - 1,
    kclass = [],
    countNum = n_classes;

  // the calculation of classes will never include the upper and
  // lower bounds, so we need to explicitly set them
  kclass[n_classes] = data[data.length - 1];
  kclass[0] = data[0];

  // the lower_class_limits matrix is used as indexes into itself
  // here: the `k` variable is reused in each iteration.
  while (countNum > 1) {
    kclass[countNum - 1] = data[lower_class_limits[k][countNum] - 2];
    k = lower_class_limits[k][countNum] - 1;
    countNum--;
  }

  return kclass;
};



// Individual frame configuration, used to set margins (defaults shown below) etc
const frame = {
    webS: gChartframe.webFrameS(sharedConfig)
     .margin({ top: 100, left: 15, bottom: 25, right: 5 })
     // .title('Put headline here') // use this if you need to override the defaults
     // .subtitle("Put headline |here") //use this if you need to override the defaults
     .height(450)
     .extend('numberOfColumns', 1)
     .extend('numberOfRows', 1),

    webM: gChartframe.webFrameM(sharedConfig)
      .margin({
          top: 100, left: 40, bottom: 86, right: 5,
      })
  // .title("Put headline here")
      .height(850)
      .extend('numberOfColumns', 1)
      .extend('numberOfRows', 1),

    webL: gChartframe.webFrameL(sharedConfig)
      .margin({
          top: 100, left: 20, bottom: 104, right: 5,
      })
  // .title("Put headline here")
      .height(1400)
      .fullYear(true)
      .extend('numberOfColumns', 1)
      .extend('numberOfRows', 1),

    webMDefault: gChartframe.webFrameMDefault(sharedConfig)
      .margin({
          top: 100, left: 20, bottom: 86, right: 5,
      })
  // .title("Put headline here")
      .height(880)
      .extend('numberOfColumns', 1)
      .extend('numberOfRows', 1),

    print: gChartframe.printFrame(sharedConfig)
     .margin({ top: 30, left: 7, bottom: 35, right: 7 })
      // .title("Put headline here")
      //.width(53.71)// 1 col
      .width(112.25)// 2 col
      //.width(170.8)// 3 col
      // .width(229.34)// 4 col
      // .width(287.88)// 5 col
      // .width(346.43)// 6 col
      // .width(74)// markets std print
      .height(100)
      .extend('numberOfColumns', 1)
      .extend('numberOfRows', 1), // std print (Use 58.21mm for markets charts that matter)

    social: gChartframe.socialFrame(sharedConfig)
        .margin({
            top: 140, left: 50, bottom: 138, right: 40,
        })
    // .title("Put headline here")
        .width(612)
        .height(612)
        .extend('numberOfColumns', 1)
        .extend('numberOfRows', 1), // 700 is ideal height for Instagram

    video: gChartframe.videoFrame(sharedConfig)
        .margin({
            left: 207, right: 207, bottom: 210, top: 233,
        })
        .extend('numberOfColumns', 1)
        .extend('numberOfRows', 1),
    // .title("Put headline here")
};


// add the frames to the page...
d3.selectAll('.framed')
  .each(function addFrames() {
      const figure = d3.select(this)
        .attr('class', 'button-holder');

      figure.select('svg')
          .call(frame[figure.node().dataset.frame]);
  });
parseData.load([dataFile, shapefile, regionsfile], { dateFormat})
  .then(({ plotData, shapeData, regionData, valueExtent, jenksValues}) => {
      Object.keys(frame).forEach((frameName) => {
        const currentFrame = frame[frameName];

        const plotDim = [currentFrame.dimension().width,currentFrame.dimension().height]
        const mapWidth = plotDim[0] / currentFrame.numberOfColumns()-(currentFrame.rem() * 1.5)
        const mapDim = [mapWidth, (mapWidth * 1.07) + currentFrame.rem() * 2];
        const carto = cartogram.draw();
        const numberofBreaks = Object.values(gChartcolour[ftColorScale]).length;
        const myLegend = gLegend.legend();

        if (scaleType === 'jenks') {
          let jenksDomain = ss.jenks(jenksValues.map(function (d) { return +d.value; }), (numberofBreaks))
          jenksDomain.shift();
          jenksDomain.pop();
          colorScale
            .domain(jenksDomain)
            .range(Object.values(gChartcolour[ftColorScale]));
        }

        if (scaleType === 'political') {
          colorScale = d3.scaleOrdinal()
            .domain(Object.keys(gChartcolour.ukPoliticalParties))
            .range(Object.values(gChartcolour.ukPoliticalParties));
        }
        console.log(plotData)
        
        carto
          .mapDim(mapDim)
          .shapeData(shapeData)
          .regionData(regionData)
          .valueExtent(valueExtent)
          .colourPalette(colorScale);

        const map = currentFrame.plot()
          .selectAll('.cartoHolder')
          .data(plotData)
          .enter()
          .append('g')
          .attr('class', 'cartoHolder')
          .attr("preserveAspectRatio", "xMinYMin")
          .call(carto);
        
        map
          .attr('transform', (d, i) => {
              const yPos = Number((Math.floor(i / currentFrame.numberOfColumns()) * mapDim[1] ));
              const xPos = i % currentFrame.numberOfColumns();
              return `translate(${(((mapDim[0] + (currentFrame.rem() * 1.5)) * xPos))}, ${yPos})`;
          });
        
        myLegend
          .seriesNames(colorScale.domain())
          .geometry(legendType)
          .frameName(frameName)
          .rem(currentFrame.rem())
          .alignment(legendAlign)
          .colourPalette(colorScale);

        // Draw the Legend
        currentFrame.plot()
          .append('g')
          .attr('id', 'legend')
          .selectAll('.legend')
          .data(colorScale.domain())
          .enter()
          .append('g')
          .classed('legend', true)
          .call(myLegend);
        

      });
  });
