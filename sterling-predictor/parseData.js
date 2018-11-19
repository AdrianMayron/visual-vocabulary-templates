/**
 * General data munging functionality
 */

import * as d3 from 'd3';
import loadData from '@financial-times/load-data';

/**
 * Parses data file and returns structured data
 * @param  {String} url Path to CSV/TSV/JSON file
 * @return {Object}     Object containing series names, value extent and raw data object
 */
export function load([url, url2], options) { // eslint-disable-line

    return loadData([ // ... and with multiple files
        url,
        url2,
    ]).then(([result1, result2]) => {
        const data = result1.data ? result1.data : result1;
        const data2 = result2.data ? result2.data : result2;
        const { dateFormat, highlightNames} = options; // eslint-disable-line no-unused-vars
        // make sure all the dates in the date column are a date object
        
        const parseDate = d3.timeParse(dateFormat);
        data.forEach((d) => {
            d.date = parseDate(d.date);
        });
        console.log('data', data)
        console.log('data2', data2)

        //Automatically calculate the seriesnames excluding the "marker" and "annotate column"
        const seriesNames = getSeriesNames(data.columns);
        console.log('seriesNames', seriesNames)
        // Use the seriesNames array to calculate the minimum and max values in the dataset
        const valueExtent = extentMulti(data, seriesNames);
        console.log('valueExtent', valueExtent)

        const isLineHighlighted = (el) => highlightNames.some(d => d === el);

        // Format the dataset that is used to draw the lines
        let highlightLines = {};
        let plotData = seriesNames.map(d => ({
            name: d,
            lineData: getlines(data, d),
            highlightLine: isLineHighlighted(d),
        }));

        highlightLines = plotData.filter(d => d.highlightLine === true);
        plotData = plotData.filter(d => d.highlightLine === false);

        // // Filter data for annotations
        // const annotations = data.filter((d) => {return d.annotate != ''});
        // //checks that annotation have a type, if non defined then defaults to 'threshold'
        // annotations.forEach((d) => {
        //     d.type = testType(d)
        // })
        // function testType(d) {
        //     if (d.type === '' || d.type === undefined || d.type === null) {
        //         return 'threshold'
        //     }
        //     else {return d.type}
        // }

        // //create an array of listing unique annotations types
        // const anoTypes = annotations.map( d => d.type)
        //     .filter((item, pos, anoTypes) => anoTypes.indexOf(item) === pos);

        // //builds annotation dataset as grouped by type
        // const annos = anoTypes.map(d => ({
        //     type: d,
        //     annotations: getAnnotations(d),
        // }));

        // function getAnnotations(el) {
        //     const types = data.filter(d => (d.type === el))
        //     .map((d) => {
        //         return {
        //             title: d.annotate,
        //             //note: '',
        //             targetX: d.date,
        //             targetY: d[plotData[0].name],
        //             radius: 0,
        //             type: d.type,
        //         }
        //     })
        //     return types
        // }

        // Format the data that is used to draw highlight tonal bands
        const boundaries = data.filter(d => (d.highlight === 'begin' || d.highlight === 'end'));
        const highlights = [];

        boundaries.forEach((d, i) => {
            if (d.highlight === 'begin') {
                highlights.push({ begin: d.date, end: boundaries[i + 1].date });
            }
        });

        return {
            data,
            seriesNames,
            plotData,
            highlightLines,
            valueExtent,
            highlights,
            // annos,
        };
    });
}


/**
 * Returns the columns headers from the top of the dataset, excluding specified
 * @param  {[type]} columns [description]
 * @return {[type]}         [description]
 */
export function getSeriesNames(columns) {
    const exclude = ['date', 'annotate', 'highlight','type'];
    return columns.filter(d => (exclude.indexOf(d) === -1));
}

/**
 * Calculates the extent of multiple columns
 * @param  {[type]} d       [description]
 * @param  {[type]} columns [description]
 * @param  {[type]} yMin    [description]
 * @return {[type]}         [description]
 */
export function extentMulti(d, columns, yMin) {
    const ext = d.reduce((acc, row) => {
        const values = columns.map(key => row[key])
        .map((item) => {
            if (!item || item === '*') {
                return yMin;
            }
            return Number(item);
        });
        const rowExtent = d3.extent(values);
        if (!acc.max) {
            acc.max = rowExtent[1];
            acc.min = rowExtent[0];
        } else {
            acc.max = Math.max(acc.max, rowExtent[1]);
            acc.min = Math.min(acc.min, rowExtent[0]);
        }
        return acc;
    }, {});
    return [ext.min, ext.max];
}

/**
 * Sorts the column information in the dataset into groups according to the column
 * head, so that the line path can be passed as one object to the drawing function
 */
export function getlines(d, group) {
    // console.log('d and group',d,group)
    const lineData = [];
    d.forEach((el) => {
        // console.log(el,i)
        const column = {};
        column.name = group;
        column.date = el.date;
        column.value = +el[group];
        column.highlight = el.highlight;
        column.annotate = el.annotate;
        if (el[group]) {
            lineData.push(column);
        }

        // if(el[group] == false) {
        //     lineData.push(null)
        // }
        if (el[group] === false && joinPoints === false) {
            lineData.push(null);
        }
    });
    return lineData;
    // return d.map((el) => {
    //     if (el[group]) {
    //         return {
    //             name: group,
    //             date: el.date,
    //             value: +el[group],
    //             highlight: el.highlight,
    //             annotate: el.annotate,
    //         };
    //     }

    //     return null;
    // }).filter(i => i);
}