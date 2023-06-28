/*colorMap.js - function that calls highcharts and actually colors the map */
function colorMap(map) {

    //  console.log("coloring new", map);
    //set default dropdown selections if defined
    colorMap.dropdown_presets = colorMap.dropdown_presets || map.dropdown_presets;
    for (id in map.dropdown_presets) {
        document.getElementById(id).selectedIndex = map.dropdown_presets[id];
    }

    Highcharts.setOptions({
        lang: {
            thousandsSep: ','
        }
    });

    //adds a countDecimals function to be used in label formatters
    Number.prototype.countDecimals = function () {
        if (Math.floor(this.valueOf()) === this.valueOf()) return 0;
        return this.toString().split(".")[1].length || 0;
    }

    String.prototype.countDecimals = function () {
        let decimals = this.split(".")[1];
        return decimals ? decimals.length : 0;
    }



    /* function that uses selected filters to return a current datafram */

    function getCurrentDataframe(map) {

        let current_dataframe = map.dataframe;

        //if map is filtered by filters dropdowns
        map.filters.forEach(function (filter) {
            if (filter.filter_by_selected != "") {
                current_dataframe = current_dataframe.filterByColumn(filter.filter_by_category, filter.filter_by_selected);
            }
        });


        //if map is animated, color by selected date
        if (map.animate_map_by != "") {

            if (map.animate_over_multiple_columns) {
                map.color_map_by = map.current_date;
            } else {
                current_dataframe = current_dataframe.filterByColumn(map.animate_map_by, map.current_date);
            }
        }

        return current_dataframe;
    }


    /* function that returns an array of area names from map.dataframe */

    function getAreas(map, current_dataframe) {

        let areas = [];
        if (map.bubble_areas != undefined && map.bubble_areas != "") {
            areas = map.bubble_areas;
        } else if (map.join_map_areas_by != "") {
            areas = current_dataframe.getColumn(map.join_map_areas_by).matrix;
        }

        if (map.template_type === "usa-counties") {
            areas = areas.map(county => county.replace(/ County\/city| Borough\/city| Borough\/municipality| County| Borough| Parish| Census Area/i, ""));
        }

        if (map.template_type === "state-counties") {
            areas = areas.map(county => county.replace(/ County\/city.*| Borough\/city.*| Borough\/municipality.*| County.*| Borough.*| Parish.*| Census Area.*/i, ""));
        }

        //trim QCEW state fips codes to be 2 digit instead of 6
        if (map.join_map_areas_to === "fips" && map.template_type === "usa") {
            areas = areas.map(area => area.substring(0, 2));
        }

        return areas;
    }



    //function to return the extra value array for a given series - called below
    function getExtraValues(info, area_index) {

        let extra_values = [];
        for (key in info) {
            let val = info[key][area_index];
            if (val != undefined) {
                extra_values.push(val);
            }
        }

        return extra_values;
    }


    /* returns the current (selected or specific time) data from the dataframe to show in map. Returns array / expects map */
    function getSelectedData(map, series_type) {

        //takes a number, and if it's a US map, returns a negative num (called for longitudes)
        function absNegative(val, map_template) {
            if (map_template.match("us-")) {
                val = Math.abs(val) * -1;
            }
            return val;
        }

        let current_dataframe = getCurrentDataframe(map);


        //get longitude and get latitude functions (called in next loop for points on a map (mapbubble))
        let latitudes, longitudes;
        if (series_type === "mapbubble") {
            latitudes = map.latitude_category != "" ? current_dataframe.getColumn(map.latitude_category).matrix : [];
            longitudes = map.longitude_category != "" ? current_dataframe.getColumn(map.longitude_category).matrix : [];

            map.bubble_areas = map.join_bubble_areas_by != "" ? current_dataframe.getColumn(map.join_bubble_areas_by).matrix : [];

        }

        function getLon(val) {
            val = val.replace("'", "");
            val = Number(val) + (map.add_jitter_to_bubble ? (Math.random() * 1.1) : 0);

            if (isNaN(val)) {
                return -105.001; //mid US
            } else {
                return absNegative(val, map.map_template);
            }
        }

        function getLat(val) {
            val = val.replace("'", "");
            val = Number(val) + (map.add_jitter_to_bubble ? (Math.random() * 1.1) : 0);

            if (isNaN(val)) {
                return 38.001; //mid US
            } else {
                return val;
            }
        }



        //function that attempts to return a saved lon or lat value if avaible in the global saved_area_locations obj
        function getSavedLocation(area_name, key) {

            if (map.saved_area_locations[area_name]) {
                //keep track of found location and return lat or lon value
                if (key === "lat") {
                    map.foundLocations.push(area_name);
                }

                return map.saved_area_locations[area_name][key];
            } else {
                if (key === "lat") {
                    map.notFoundLocations.push(area_name);
                }
                return key === "lat" ? 38.001 : -105.001; //mid us values (z-value will later be set to 0 if found)
            }
        }
        //found and not found locations reset when colorMap() is called
        map.foundLocations = [];
        map.notFoundLocations = [];


        /* create series data array to be used in colorMap() */


        //get array of area names from matrix
        let areas = getAreas(map, current_dataframe);

        let values = map.color_map_by != "" ? current_dataframe.getColumn(map.color_map_by).matrix : [];

        //add extra data for tooltips
        let series_tooltip_extra_info = {}; //will be keys with arrays
        if (map.tooltip_add_extra_info) {

            map.tooltip_selected_extra_info.forEach(function (extra_info_header) {
                series_tooltip_extra_info[extra_info_header] = current_dataframe.getColumn(extra_info_header).matrix;
            });

        }

        //add values for datalabels
        let series_data_labels_info = {}; //will be keys with arrays
        if (map.data_labels.selected_values.length > 0 && map.data_labels.selected_values[0] !== "") {
            map.data_labels.selected_values.forEach(function (datalabel_header) {
                series_data_labels_info[datalabel_header] = current_dataframe.getColumn(datalabel_header).matrix;
            });
        }


        //put areas and values into final series array of objects for highcharts
        let selected_data = [];
        for (let i = 0; i < areas.length; i++) {

            let value = null;
            let display_value = null; //used to display in the tooltips so the decimal place is the same (ie 5.0 and not trimmed)
            if (values[i] != undefined) {
                display_value = values[i];
                value = values[i].replace(/,/g, "").replace(/\$/g, "").replace(/%/g, "");
                if (value.toString().trim().length === 0) {
                    value = null;
                } else if (!isNaN(value)) {
                    value = Number(value);
                }
            }

            selected_data.push({
                area: areas[i],
                value: value,
                color: isNaN(value) ? "rgb(173, 173, 173)" : null,
                display_value: display_value,
                extra_values: map.tooltip_add_extra_info ? getExtraValues(series_tooltip_extra_info, i) : null,
                data_label_values: map.data_labels.enabled && map.data_labels.selected_values.length > 0 ? getExtraValues(series_data_labels_info, i) : null,
                dataLabels: {
                    className: areas[i] +"_datalabel",
                    padding: 0,
                    x: map.data_labels.positions[areas[i]] ? map.data_labels.positions[areas[i]].x : 0,
                    y: map.data_labels.positions[areas[i]] ? map.data_labels.positions[areas[i]].y : 0,
                    enabled: areas[i] == "District of Columbia" || areas[i] == "DC" ? true : map.data_labels.enabled,
                    allowOverlap: areas[i] == "District of Columbia" || areas[i] == "DC" ? true : map.data_labels.allow_overlap
                },

                lon: longitudes && longitudes[i] ? getLon(longitudes[i]) : map.saved_area_locations ? Number(getSavedLocation(areas[i], "lon")) : -105.001,
                lat: latitudes && latitudes[i] ? getLat(latitudes[i]) : map.saved_area_locations ? Number(getSavedLocation(areas[i], "lat")) : 38.001,
                get z() {
                    if (this.lon === -105.001 || this.lat === 38.001) { //checks for the set number if lat or lon wasn't found - this is done because highcharts will zoom out a bunch if lat/lon is simply set to null.
                        return null;
                    } else {
                        return isNaN(value) ? 1 : value;
                    }
                }
            });

        }
        if (typeof in_map_maker !== 'undefined' && (map.foundLocations.length > 0 || map.notFoundLocations.length > 0)) {
            $("#geospatial_areas_found_span").text(map.foundLocations.length);
            $("#geospatial_areas_found_link").show();
        } else {
            $("#geospatial_areas_found_link").hide();

        }


        map.selected_data = selected_data;
        return selected_data;

    }



    /* getSeriesArr Function - returns array of objects for map series, depending on type of map */
    function getSeriesArr(map) {

        var series_arr = map.show_all_areas ? [{
            name: 'Separators',
            type: 'mapline',
            visible: true,
            lineWidth: 1,
            data: Highcharts.geojson(Highcharts.maps[map.map_template], 'mapline'),
            color: 'silver',
            nullColor: 'silver',
            showInLegend: false,
            enableMouseTracking: false,
        }] : [];



        if (map.color_by_categories) {
            let current_dataframe = getCurrentDataframe(map);
            let areas = getAreas(map, current_dataframe);
            let categories_arr = current_dataframe.getColumn(map.color_map_by).matrix;
            let series_obj = {};
            let series_tooltip_extra_info = {}; //will be keys with arrays

            if (map.tooltip_add_extra_info) {
                map.tooltip_selected_extra_info.forEach(function (extra_info_header) {
                    series_tooltip_extra_info[extra_info_header] = current_dataframe.getColumn(
                        extra_info_header).matrix;
                });
            }

            categories_arr.forEach(function (cat, i) {
                if (!series_obj[cat]) {
                    series_obj[cat] = {
                        name: cat,
                        data: [areas[i]],
                        series_tooltip_extra_info: []
                    }

                } else {
                    series_obj[cat].data.push(areas[i])
                }
                //add extra data if applicable

                if (series_tooltip_extra_info) {
                    series_obj[cat].series_tooltip_extra_info.push(getExtraValues(
                        series_tooltip_extra_info, i));
                }
            });

            for (series in series_obj) {
                series_obj[series].data = series_obj[series].data.map(
                    function (area, i) {
                        return {
                            area: area,
                            extra_values: series_obj[series].series_tooltip_extra_info[i]
                        }
                    }
                )

                series_arr.push(series_obj[series])

            }

        } else { //else not coloring by categories
            series_arr.push({
                    data: getSelectedData(map),
                    joinBy: [map.join_map_areas_to, 'area'],
                    dataLabels: {
                        padding: 0,
                        color: map.data_labels.color,
                        style: {
                            fontSize: map.data_labels.font_size,
                            textOutline: map.data_labels.text_outline,
                            fontFamily: "Arial"
                        },

                        formatter: function () {

                            var html = "";

                            if (this.key === "District of Columbia") {
                                return '<span style="color:' + this.color + '">\u25CF </span>';
                            }

                            if (this.point.data_label_values && this.point.data_label_values.length > 0) {
                                this.point.data_label_values.forEach(function (extra_val, i) {
                                    if (extra_val != undefined) {
                                        html += `${extra_val}<br>`;
                                    }
                                });

                            } else {
                                var decimals = this.point.display_value ? this.point.display_value.countDecimals() : null;
                                var prefix = map.tooltip_is_smart_prefix_suffix ? smartPrefix(map.color_map_by) : map.tooltip_prefix;
                                var suffix = map.tooltip_is_smart_prefix_suffix ? smartSuffix(map.color_map_by) : map.tooltip_suffix;
                                html += this.point.value != undefined ? prefix + Highcharts.numberFormat(this.point.value, decimals) + suffix : "";

                            }
                            return html;
                        }
                    },
                    name: map.color_map_by,
                    animation: false

                },

                {
                    type: 'mapbubble',
                    name: '',
                    dataLabels: {
                        enabled: map.data_labels.enabled,
                        allowOverlap: map.data_labels.allow_overlap,
                        padding: 0,
                        color: map.data_labels.color,
                        style: {
                            fontSize: map.data_labels.font_size,
                            textOutline: map.data_labels.text_outline,
                            fontFamily: "Arial"
                        }
                    },
                    data: map.type === "mapbubble" ? getSelectedData(map, "mapbubble") : null,
                    maxSize: map.vary_bubble_size ? map.bubble_size * 2 : map.bubble_size,
                    minSize: map.vary_bubble_size ? 1 : map.bubble_size,
                    animation: false,
                    marker: {
                        fillOpacity: map.bubble_marker_fill_opacity,
                        lineColor: map.bubble_marker_line_color
                    }

                }
            ) //end series_arr.push()

        }

        map.series = series_arr;

        return series_arr;

    };


    /* map dropdown binder - called below in categories and filter dropdown functions */
    function bindMapDropDown(map, dropdown, filter) {

        $(dropdown).unbind().change(function () {

            let selected = $(this).val();

            if (filter) {
                filter.filter_by_selected = selected;
            } else {
                map.color_map_by = selected;
            }

            //remember selection so when map is remade
            colorMap.dropdown_presets[$(this).attr("id")] = $(this).prop('selectedIndex');

            if (map.animation_controls_initialized) { // if map is animated reset to start
                //reset legend values (are saved in animation)
                colorMap.legend_max = map.legend.max;
                colorMap.legend_min = map.legend.min;
                colorMap.colorAxis_dataClasses = undefined;
                colorMap.legendLabels = undefined;

                $(`#${map.render_id}_animation_slider`).val(`${map.animation_start_index}`).trigger("input");
            } else {
                colorMap(map);
            }

        }).change();
    }


    /* controls the categories dropdown inside the map if enabled */
    let categoriesDropDownInit = (function (map) {

        if (map.categories_dropdown_enabled && !map.categories_dropdown_initialized) {
            map.categories_dropdown_initialized = true;
            let dropdown = $("#" + map.render_id + "_categories_dropdown");
            bindMapDropDown(map, dropdown);
        }

    })(map);



    /*controls the filter dropdown inside the map if enabled */
    let filterDropDownInit = (function (map) {

        map.filters.forEach(function (filter) {
            if (filter.filter_by_category != "" && !filter.initialized) {
                filter.initialized = true;
                let dropdown = $("#" + map.render_id + filter.dropdown_name);
                bindMapDropDown(map, dropdown, filter);
            }
        });

    })(map);



    /*controls the animation if enabled */
    function animationControlsInit(map) {
        // console.log("initializing animate");

        map.animation_controls_initialized = true;
        let animation_slider = $(`#${map.render_id}_animation_slider`);
        let animation_display_text = $(`#${map.render_id}_animation_display_text`);
        let animation_button = $(`#${map.render_id}_animation_button`);

        animation_slider.on("input", function () {
            map.current_date = map.animation_dates[animation_slider.val()];
            animation_display_text.text(map.current_date);
            colorMap(map);
        });

        animation_slider.bind("reset", function () {
            stop();
            animation_slider.val(map.animation_start_index);
            map.current_date = map.animation_dates[map.animation_start_index];
            animation_display_text.text(map.current_date);
            colorMap(map);
        });



        let playing; //to be setTimeOut function
        let is_playing = false;


        function stop() {
            is_playing = false;
            animation_button.text("Play")
                .attr("aria-label", "Play")
                .attr("alt-text", "Play");
            clearInterval(playing);
        }

        function play() {
            is_playing = true;
            animation_button.text("Pause")
                .attr("aria-label", "Pause")
                .attr("alt-text", "Pause");

            //reset if slider is at the end when it starts
            if (animation_slider.val() == animation_slider.attr("max")) {
                animation_slider.val(0).trigger("input");
            }

            playing = setInterval(function () {
                let new_val = Number(animation_slider.val()) + 1;
                if (new_val > animation_slider.attr("max")) {
                    stop();
                } else {
                    animation_slider.val(new_val).trigger("input");
                }
            }, map.animation_delay);


        }

        animation_button.click(function () {
            if (is_playing) {
                stop();
            } else {
                play();
            }
        });

    }

    if (map.animate_map_by != "" && !map.animation_controls_initialized) {

        animationControlsInit(map);
    }


    //smart prefix and suffix functions
    function smartPrefix(color_map_by) {
        return color_map_by.match(/earning|dollar|wage/i) ? "$" : "";
    }

    function smartSuffix(color_map_by) {
        return color_map_by.match(/rate|percent/i) ? "%" : "";
    }



    /*gets dataClasses array for colorAxis (legend in map obj) */
    function getDataClasses(map) {

        if (colorMap.colorAxis_dataClasses) { //if it's already set (as in animated maps)
            return colorMap.colorAxis_dataClasses;
        } else {

            let dataClasses = [];

            let all_values = map.selected_data.map(function (area, i) {
                return area.value;
            }).sort((a, b) => a - b).filter(() => !null);


            let set_ranges = map.legend.data_class_ranges;

            for (let i = 0; i < map.colors.length; i++) {

                // check if the range has been manually set before auto calculating
                let breakpoint = isNaN(set_ranges[i].from) || set_ranges[i].from == null ? all_values[Math
                    .floor(all_values.length * (i / map.colors.length))] : set_ranges[i].from;

                let breakpoint_2 = isNaN(set_ranges[i].to) || set_ranges[i].to == null ? all_values[Math.floor(
                    all_values.length * ((i + 1) / map.colors.length))] : set_ranges[i].to;

                if (i === 0) {
                    dataClasses.push({
                        to: breakpoint_2,
                    }); //start
                } else if (i === map.colors.length - 1) {
                    dataClasses.push({
                        from: breakpoint,
                    }); //end
                } else {
                    dataClasses.push({
                        from: breakpoint,
                        to: breakpoint_2
                    }); //mids
                }

            }

            dataClasses.forEach(function (obj, i) {
                obj.color = map.patterns ? {
                        pattern: map.patterns[i]
                    } :
                    map.colors[i];
            });

            colorMap.colorAxis_dataClasses = dataClasses;
            return dataClasses;

        }


    }




    /* Initiate the map */

    Highcharts.mapChart(`${map.render_id}_inner_div`, {

        chart: {
            map: map.map_template,
            borderWidth: 0,
            width: map.width,
            height: map.height,
            spacing: [10, 0, 15, 10]
        },

        title: {
            text: map.title,
            style: {
                fontSize: "0px"
            } //title is put above outside of svg
        },

        subtitle: {
            text: map.subtitle,
            style: {
                fontSize: "0px"
            } //subtitle is put above outside of svg
        },

        colors: map.colors,

        series: getSeriesArr(map), //returns an array of series objects - defined above

        legend: {
            enabled: map.legend.enabled,
            layout: map.legend.layout,
            reversed: map.legend.reversed,
            verticalAlign: map.legend.vertical_align,
            align: map.legend.horizontal_align,
            backgroundColor: map.legend.background_color,
            borderRadius: 5,
            itemMarginTop: 5,
            borderWidth: 1,
            borderColor: map.legend.border_color,
            floating: false,
            x: map.legend.x + (map.legend.horizontal_align === "right" ? -30 : 0),
            y: map.legend.y,
            symbolRadius: 0,
            label_index: -1, // this is counted through in labelFormatter to look for cached legend labels in animated maps
            symbolHeight: map.legend.symbol_height,
            symbolWidth: map.legend.symbol_width,
            padding: 12,
            itemStyle: {
                fontWeight: 'normal',
                fontSize: map.legend.values_font_size,
                color: map.legend.values_text_color,
            },

            labelFormatter: function () {

                var highest_decimal = 0;

                if (map.color_by_categories) {
                    return this.name;
                } else if (map.legend.has_data_classes) {

                    this.chart.options.legend.label_index++;
                    colorMap.legendLabels = colorMap.legendLabels || [];

                    var from_decimals = this.from ? this.from.countDecimals() : null;
                    var to_decimals = this.to ? this.to.countDecimals() : null;

                    highest_decimal = map.legend.fixed_decimals || Math.max(highest_decimal, from_decimals, to_decimals);

                    if (colorMap.legendLabels[this.chart.options.legend.label_index]) { //return cached label if available
                        return colorMap.legendLabels[this.chart.options.legend.label_index];
                    }

                    if (this.from != null && this.to != null) { //mid
                        var label = colorMap.legendLabels[this.chart.options.legend.label_index] = map.legend.prefix + Highcharts.numberFormat(this.from, highest_decimal) + map.legend.suffix + ' to ' + map.legend.prefix + Highcharts.numberFormat(this.to, highest_decimal) + map.legend.suffix;
                        return label;

                    } else if (this.to != null) { //start
                        var label = colorMap.legendLabels[this.chart.options.legend.label_index] = map.legend.prefix + Highcharts.numberFormat(this.to, highest_decimal) + map.legend.suffix + ' and lower';
                        return label;

                    } else if (this.from != null) { //end
                        var label = colorMap.legendLabels[this.chart.options.legend.label_index] = map.legend.prefix + Highcharts.numberFormat(this.from, highest_decimal) + map.legend.suffix + ' and higher';
                        return label;
                    }

                }
            },

            title: {
                text: map.legend.title_text,
                style: {
                    color: map.legend.title_text_color,
                    fontSize: map.legend.title_font_size,
                    fontWeight: "normal"
                }
            }

        },


        colorAxis: (function () {
            if (!map.color_by_categories) {

                return {
                    min: colorMap.legend_min !== undefined && colorMap.legend_min !== -Infinity ? colorMap.legend_min : map.legend.min,
                    max: colorMap.legend_max !== undefined && colorMap.legend_max !== Infinity ? colorMap.legend_max : map.legend.max,
                    reversed: map.legend.reversed,
                    minColor: map.colors[0],
                    maxColor: map.colors[map.colors.length - 1],
                    showFirstLabel: true,
                    gridLineWidth: 2,
                    gridLineColor: '#fff',
                    tickWidth: 2,
                    tickInterval: map.legend.tick_interval,
                    tickColor: '#fff',
                    stops: map.colors.map(function (color, i) {
                        return [i / (map.colors.length - 1), color]
                    }),
                    type: map.logarithmic_scale,
                    startOnTick: map.legend.start_on_tick,
                    endOnTick: map.legend.end_on_tick,
                    dataClasses: map.legend.has_data_classes ? getDataClasses(map) : null,
                    labels: {
                        x: 5,
                        style:{
                            color: map.legend.values_text_color,
                            fontSize: map.legend.values_font_size
                        },
                        formatter: function () {
                            var decimals = map.legend.fixed_decimals;
                            if (decimals === undefined){
                                decimals = this.value ? this.value.countDecimals() : null;
                            }
                            
                            return map.legend.prefix + Highcharts.numberFormat(this.value, decimals) + map.legend.suffix;
                        }
                    }
                }
            }
        })(),


        mapNavigation: {
            enabled: map.zoom_buttons_enabled,
            buttonOptions: {
                x: -7
            }
        },

        tooltip: {
            formatter: function () {

                var decimals = this.point.display_value ? this.point.display_value.countDecimals() : null;
                var prefix = map.tooltip_is_smart_prefix_suffix ? smartPrefix(map.color_map_by) : map.tooltip_prefix;
                var suffix = map.tooltip_is_smart_prefix_suffix ? smartSuffix(map.color_map_by) : map.tooltip_suffix;
                var name = this.point.name ? this.point.name : this.point.area;
                var val = map.color_by_categories ? this.series.name :
                    !isNaN(this.point.value) ? prefix + (Highcharts.numberFormat(this.point.value, decimals)) + suffix : this.point.value;
                var html = name;

                if (val != "") {
                    html += "<br>" + map.color_map_by + ": <strong>" + val + "<\/strong>";
                }

                if (this.point.extra_values) {
                    html += "<br>";
                    this.point.extra_values.forEach(function (extra_val, i) {
                        if (extra_val != undefined) {
                            html += `<br>${map.tooltip_selected_extra_info[i]}: ${extra_val}`;
                        }
                    });
                }

                return html;
            },

        },

        plotOptions: {
            map: {
                joinBy: map.color_by_categories ? [map.join_map_areas_to, 'area'] : null,
                borderColor: map.areas_border_color,
                borderWidth: map.areas_border_width,
                allAreas: map.show_all_areas,

            }
        },

        caption: {
            text: map.caption.text,
            align: map.caption.horizontal_align,
            verticalAlign: map.caption.vertical_align,
            margin: 30,
            y: 5,
            floating: false,
            useHTML: true,
            style: {
                color: "#000",
                fontSize: "14px"
            }
        },

        accessibility: {
            description: map.accessibility_description
        },

        lang: {
            accessibility: {
                chartContainerLabel: map.accessibility_description
            }
        },

        credits: {
            text: map.credits_text,
            href: "/",
            mapText: "",
            position: {
                align: map.credits_horizontal_align,
                x: map.credits_x_offset
            },
            style: {
                fontSize: "14px",
                color: "#000"
            }
        },

        navigation: {
            buttonOptions: {
                theme: {
                    // Good old text links
                    style: {
                        color: '#039',
                        textDecoration: 'underline'
                    }
                }
            }
        },

        exporting: {
            enabled: map.exporting_menu_enabled,
            url: "",
            fallbackToExportServer: false,
            scale: 1,
            chartOptions: {
                title: {
                    align: map.title_horizontal_align,
                    style: {
                        fontSize: map.title_font_size
                    } //title is put above outside of svg
                },
                subtitle: {
                    text: (function () {
                        return map.subtitle + "<br>" +
                            (map.categories_dropdown_enabled ? map.color_map_by + "<br>" : "") +
                            (map.filters[0].filter_by_selected != "" ? map.filters[0].filter_by_selected + "<br>" : "") +
                            (map.filters[1].filter_by_selected != "" ? map.filters[1].filter_by_selected + "<br>" : "") +
                            (map.current_date ? map.current_date : "");
                    })(),
                    align: map.subtitle_horizontal_align,
                    style: {
                        fontSize: map.subtitle_font_size
                    } //subtitle is put above outside of svg
                },
                legend: {
                    x: map.legend.x + (map.legend.horizontal_align === "right" ? -30 : 0) + 18,
                    y: map.legend.y + (map.title != "" ? map.title_font_size : 0) + (map.subtitle != "" ? map.subtitle_font_size : 0) - 2
                }
            },

            buttons: {
                contextButton: {
                    text: "<span style='color: #112e51'>Options</span>",
                    symbolY: 14,
                    symbolStroke: '#112e51',

                    menuItems: [{
                            textKey: 'printChart',
                            onclick: function () {
                                $(".highcharts-focus-border").remove();
                                this.print();

                            }
                        }, {
                            separator: true
                        }, {
                            textKey: 'downloadPNG',
                            onclick: function () {
                                this.exportChartLocal();
                                menuFocus(map);
                            }
                        }, {
                            textKey: 'downloadJPEG',
                            onclick: function () {
                                this.exportChartLocal({
                                    type: 'image/jpeg'
                                });
                                menuFocus(map);
                            }
                        }, {
                            textKey: 'downloadSVG',
                            onclick: function () {
                                this.exportChartLocal({
                                    type: 'image/svg+xml'
                                });
                                menuFocus(map);
                            }
                        }, {
                            separator: true
                        }, {
                            text: 'Show table',
                            onclick: function () {
                                colorMap.showTable(map);
                            }
                        },
                        {
                            text: 'Download CSV',
                            onclick: function () {
                                downloadCSV(map);
                                menuFocus(map);
                            }
                        }
                    ]
                },

            }

        }
    }, function (chart) { //map callback (called after map loads)

        // console.log("chart", chart);

        if (map.animation_controls_initialized) {
            colorMap.legend_min = colorMap.legend_min || map.legend.min || chart.colorAxis[0].dataMin;
            colorMap.legend_max = colorMap.legend_max || map.legend.max || chart.colorAxis[0].dataMax;
        }

        //when svg is clicked, check what tool is being used and draw accordingly
        $("svg.highcharts-root").click(function (event) {
            if (typeof current_tool !== "undefined" && current_tool.draw) {
                current_tool.draw(event);
            }
        });

    });



    //show table function
    colorMap.showTable = function (map) {

        window.scrollTo(0, 0);

        let display_dataframe = map.dataframe.removeColumns(map.excluded_columns_from_table);
        let table = display_dataframe.getHTMLtable();

        var table_popup_div = $(`<div><a class="close_popup" aria-label="close table popup" href="#${map.render_id}">Close<\/a>${table}<\/div>`)
            .addClass("table_popup_div")
            .appendTo($("body"));

        $(`<caption style="background-color: #fff;">${map.title}<\/caption>`).insertBefore($(".table_popup_div table thead"));

        $(".close_popup").focus();
        //make other elements not focusable
        $('a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, *[tabindex], *[contenteditable]').not(".close_popup")
            .attr("tabindex", "-1").addClass("focus-disabled");

        $(".close_popup").click(function (e) {
            e.preventDefault();
            closeTable(map);
        });

    }

    //focus on highcharts menu
    function menuFocus(map) {
        $(`#${map.render_id}_outer_div .highcharts-a11y-proxy-button`).focus();
    }

    //close table function
    function closeTable(map) {

        $(".table_popup_div").remove();
        $(".focus-disabled").attr("tabindex", "0").removeClass("focus-disabled");

        let map_div = $("#" + map.render_id + "_outer_div");

        $([document.documentElement, document.body]).animate({
            scrollTop: map_div.offset().top - 60
        }, 1);

        menuFocus(map);

    }



    //download CSV function (uses FileSaver.js and saveAs)
    function downloadCSV(map) {

        let display_dataframe = map.dataframe.removeColumns(map.excluded_columns_from_table);
        let csv = [];

        display_dataframe.matrix.forEach(function (row) {
            let str_row = row.map(cell => `"${cell}"`).join(",");
            csv.push([str_row]);
        });

        csv = csv.join("\n");

        let file = new File([csv], `${map.title}.csv`, {
            type: "text/plain;charset=utf-8"
        });
        saveAs(file);
    }
}