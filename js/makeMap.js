/* makeMap - calls the HC map making function with passed data and options */


/*function that gets the map options from the inputs and calls colorMap to render on page */
function makeMap(color_map_next, make_map_next) {

    console.log("making map");


    /*gets an array and returns an html string of those elements wrapped in <option> tags (called in the setupDropdown functions) */
    function getOptionsHTML(arr, allow_none) {

        //add an empty option at begining if it was checked - so filters can "show all / be not used"
        let options_html = allow_none ? "<option></option>" : "";

        arr.forEach(element => {
            options_html += `<option>${element}</option>`;
        });

        return options_html;
    }

    /*adds option html to <select> and shows its containing div of simular name*/
    function displayDropdown(map_id, name, options_html, label_text) {

        $("#" + map_id + name).html(options_html);
        $("#" + map_id + name + "_div").show();
        $("#" + map_id + name + "_label").text(label_text);
    }



    /*sets up categories dropdown menu - called if enabled */
    function setupCategoriesDropdown(map) {

        let options_html = getOptionsHTML(map.categories_dropdown_options);
        displayDropdown(map.render_id, "_categories_dropdown", options_html, map.categories_dropdown_label);
    }



    /* sets up the filter dropdown menus - called if enabled */
    function setupFilterDropdown(map, filter) {

        filter.filter_options = map.dataframe.getColumn(filter.filter_by_category).getUniques().matrix;

        let options_html = getOptionsHTML(filter.filter_options, filter.allow_none);
        displayDropdown(map.render_id, filter.dropdown_name, options_html, filter.label);
    }



    /*sets up animation controls - called if enabled */
    function setupAnimationControls(map) {

        if (map.animate_over_multiple_columns) {
            map.animation_dates = map.animate_map_by;
        } else {
            map.animation_dates = map.dataframe.getUniques(map.animate_map_by).matrix;
        }


        if (map.animation_dates.length > 0) {

            map.animation_start_index = map.start_animation_at_last_point ? map.animation_dates.length - 1 : 0;

            let animation_slider = $(`<input type='range' id='${map.render_id}_animation_slider' class='animation_slider' min='0' max='${map.animation_dates.length - 1}' value='${map.animation_start_index}' aria-label='Slider for map animation'
            style='float: left;
            width: 70%;
            padding: 0px 0px 0px 0px;
            height: 0.6rem;
            top: 10px;
            position: relative;
            margin-right: 5px;
            border: none;
            z-index: 200;
            background: #d6d7d9;'/>`);

            let animation_button = $(`<button id='${map.render_id}_animation_button' class='animation_button' style='color: #fff; float: left; margin-left: 0px; margin-right: 10px; background-color: #ce1c00; border: none;
            padding: 5px; margin-top: 0px; position: relative; bottom: -2px; z-index: 400; width: 55px;' aria-label='Play' alt-text="Play">Play</button>`);

            let animation_display_text = $(`<div id='${map.render_id}_animation_display_text' class='animation_display_text' style='float: left; font-size: 1.2em; position: relative; top: 0px;'>${map.animation_dates[map.animation_start_index]}</div>`);
            map.current_date = map.animation_dates[animation_slider.val()];

            $(`#${map.render_id}_animation_controls_div`).html(animation_button).append(animation_slider, animation_display_text).show();

        }

    }


    /* gets dataClasses for legend from user input */
    function getDataClassRanges() {

        if (!$("#map_legend_dataclasses_checkbox").is(":checked")) {
            return undefined;
        } else {

            let data_class_ranges = [];
            $(".legend_range_input_span").each(function (i, e) {

                data_class_ranges.push({
                    from: parseFloat($(".from_input", e).val()),
                    to: parseFloat($(".to_input", e).val())
                })
            });
            return data_class_ranges;
        }
    }



    /* Global map variable */
    map = {
        map_maker_version: map_maker_version,
        dataframe: DF(DF.convertToTSV($("#import_data_textarea").val())),
        data_url: ($("#live_data_connection_checkbox").is(":checked") && $("#get_csv_from_url_input").val() !== "") ? $("#get_csv_from_url_input").val() : null,
        render_id: "map1",
        type: $("#geospatial_li").hasClass("active") ? "mapbubble" : "map",

        title: $("#map_title_input").val() || "",
        title_horizontal_align: $("#map_title_horizontal_align").val(),
        title_font_size: Number($("#map_title_font_size").val()),
        title_font_family: $("#map_title_font_family").val(),
        title_font_weight: $("#map_title_font_bold_checkbox").is(":checked") ? "bold" : "normal",

        subtitle: $("#map_subtitle_input").val() || "",
        subtitle_horizontal_align: $("#map_subtitle_horizontal_align").val(),
        subtitle_font_size: Number($("#map_subtitle_font_size").val()),

        credits_text: $("#map_credits_input").val() || "",
        credits_horizontal_align: $("#map_credits_horizontal_align").val(),
        credits_x_offset: $("#map_credits_horizontal_align").val() === "right" ? -45 : 10,

        caption: {
            text: $("#map_caption_input").val().replace(/\n/g, "<br>") || "",
            horizontal_align: $("#map_caption_horizontal_align").val(),
            vertical_align: $("#map_caption_vertical_align").val(),
        },
        accessibility_description: $("#map_accessibility_description").val(),

        map_template: $("#map_templates_dropdown").val(),
        template_type: $("#map_templates_dropdown option:selected").attr("data-type"),
        width: $("#map_width_input").val() === "" ? null : $("#map_width_input").val(),
        height: $("#map_height_input").val() === "" ? null : $("#map_height_input").val(),
        outer_div_margin: $("#map_centered_checkbox").is(":checked") ? "auto" : "20px",

        zoom_buttons_enabled: $("#zoom_buttons_enabled_checkbox").is(":checked"),
        exporting_menu_enabled: $("#exporting_menu_enabled_checkbox").is(":checked"),

        excluded_columns_from_table: $("#map_exclude_columns_from_table_dropdown_checkbox").is(":checked") ? $("#map_exclude_columns_from_table_multiselect").val() : [],

        colors: (function () {
            let colors = [];
            let colors_inputs = $("#map_color_by_categories_checkbox").is(":checked") ? $(".map_category_color_input") : $(".map_legend_color_input");

            $(colors_inputs).each(function () {
                colors.push($(this).val())
            });
            return colors;
        })(),

        patterns: $("#map_apply_patterns_checkbox").is(":checked") && $("#map_legend_dataclasses_checkbox").is(":checked") ?
            (function () {
                return Highcharts.patterns.map(function (pattern, i) {
                    pattern.color = $(".map_legend_color_input:eq(" + i + ")").val() || pattern.color;
                    return pattern;
                })
            })() : false,

        areas_border_color: $("#map_area_border_color_input").val(),
        areas_border_width: $("#map_areas_border_width_number").val() === "" ? 1 : Number($("#map_areas_border_width_number").val()),

        container_border_color: $("#map_container_border_color_input").val(),

        color_map_by: $("#map_color_by_category_dropdown").val(),
        color_by_categories: $("#map_color_by_categories_checkbox").is(":checked"),

        logarithmic_scale: $("#map_logarithmic_checkbox").is(":checked") ? "logarithmic" : null,
        show_all_areas: $("#map_show_all_areas_checkbox").is(":checked") && !$("#map_color_by_categories_checkbox").is(":checked"),

        legend: {
            enabled: $("#map_legend_is_enabled_checkbox").is(":checked"),
            reversed: $("#map_legend_is_reversed_checkbox").is(":checked"),
            layout: $("#map_legend_layout").val(),
            vertical_align: $("#map_legend_vertical_align").val(),
            horizontal_align: $("#map_legend_horizontal_align").val(),
            symbol_height: $("#map_legend_symbol_height").val() === "" ? undefined : Number($("#map_legend_symbol_height").val()),
            symbol_width: $("#map_legend_symbol_width").val() === "" ? undefined : Number($("#map_legend_symbol_width").val()),
            min: $("#map_legend_min_number").val() === "" ? undefined : Number($("#map_legend_min_number").val()),
            max: $("#map_legend_max_number").val() === "" ? undefined : Number($("#map_legend_max_number").val()),
            start_on_tick: $("#map_legend_start_on_tick_checkbox").is(":checked"),
            end_on_tick: $("#map_legend_end_on_tick_checkbox").is(":checked"),
            tick_interval: $("#map_legend_tick_interval").val() === "" || $("#map_legend_tick_interval").val() < 0 ? undefined : Number($("#map_legend_tick_interval").val()),
            fixed_decimals: $("#map_legend_fixed_decimals").val() === "" ? undefined : Number($("#map_legend_fixed_decimals").val()),
            title_text: $("#map_legend_title_text").val(),
            title_font_size: Number($("#map_legend_title_font_size").val()),
            values_font_size: Number($("#map_legend_values_font_size").val()),
            has_data_classes: $("#map_legend_dataclasses_checkbox").is(":checked"),
            data_class_ranges: getDataClassRanges(),
            suffix: $("#map_legend_suffix_input").val(),
            prefix: $("#map_legend_prefix_input").val(),
            x: Number($("#map_legend_x_number").val()),
            y: Number($("#map_legend_y_number").val()),
            background_color: $("#map_edit_legend_background_checkbox").is(":checked") ? $("#map_legend_background_color").val() : "none",
            border_color: $("#map_edit_legend_background_checkbox").is(":checked") ? $("#map_legend_border_color").val() : "none",
            title_text_color: $("#map_legend_title_text_color").val(),
            values_text_color: $("#map_legend_values_text_color").val(),

        },

        tooltip_is_smart_prefix_suffix: $("#map_tooltip_smart_prefix_suffix").is(":checked"),
        tooltip_prefix: $("#map_tooltip_prefix_input").val(),
        tooltip_suffix: $("#map_tooltip_suffix_input").val(),
        tooltip_add_extra_info: $("#map_add_extra_info_to_tooltip_checkbox").is(":checked"),
        tooltip_selected_extra_info: $("#map_add_extra_info_to_tooltip_multiselect").val(),

        data_labels: {
            enabled: $("#map_data_labels_checkbox").is(":checked"),
            selected_values: $("#map_data_labels_values_multiselect").val(),
            color: $("#map_data_labels_color").val(),
            font_size: $("#map_data_labels_font_size").val(),
            allow_overlap: $("#map_data_labels_allow_overlap_checkbox").is(":checked"),
            text_outline: $("#map_data_labels_text_outline_checkbox").is(":checked") ? "1px contrast" : "none",
            positions: window.data_labels_positions
        },

        join_map_areas_by: $("#join_map_areas_by_category_dropdown").val(),
        join_map_areas_to: $("#join_map_areas_to_template_dropdown").val(),

        longitude_category: $("#longitude_category_dropdown").val(),
        latitude_category: $("#latitude_category_dropdown").val(),
        saved_area_locations: $("#use_saved_lat_lon_checkbox").is(":checked") ? saved_area_locations : null,
        foundLocations: [],
        notFoundLocations: [],

        join_bubble_areas_by: $("#bubble_area_dropdown").val(),
        bubble_size: $("#bubble_size_number").val(),
        bubble_marker_fill_opacity: $("#bubble_opacity_number").val(),
        bubble_marker_line_color: $("#map_area_border_color_input").val(),
        vary_bubble_size: $("#vary_bubble_size_checkbox").is(":checked"),
        add_jitter_to_bubble: $("#add_jitter_to_bubble_checkbox").is(":checked"),

        categories_dropdown_enabled: $("#map_create_extra_categories_dropdown_checkbox").is(":checked"),
        categories_dropdown_label: $("#map_categories_options_multiselect_label").val(),
        categories_dropdown_options: [],

        animate_over_multiple_columns: $("#map_animate_over_multiple_columns_checkbox").is(":checked"),
        animate_map_by: $("#map_animate_over_multiple_columns_checkbox").is(":checked") ? $("#map_animate_over_multiple_columns_multiselect").val() : $("#map_is_animated_dropdown").val(),
        animation_delay: $("#map_animation_delay_number").val(),
        animation_dates: [],
        start_animation_at_last_point: $("#map_start_animation_at_last_point_checkbox").is(":checked"),


        filters: [{
                filter_by_category: $("#filter_by_category_dropdown").val(),
                filter_by_selected: "",
                dropdown_name: "_filter_dropdown",
                label: $("#filter_by_category_label").val(),
                allow_none: $("#filter_by_category_allow_none_checkbox").is(":checked"),
                initialized: false
            },
            {
                filter_by_category: $("#secondary_filter_by_category_dropdown").val(),
                filter_by_selected: "",
                dropdown_name: "_secondary_filter_dropdown",
                label: $("#secondary_filter_by_category_label").val(),
                allow_none: $("#secondary_filter_by_category_allow_none_checkbox").is(":checked"),
                initialized: false
            }
        ],

        dropdown_presets: colorMap.dropdown_presets || {},

        categories_dropdown_initialized: false,
        animation_controls_initialized: false

    }

    //console.log("map", map);

    //add title and subtitle (it's outside of map svg so it can be above filter / animation controls)
    $(`#${map.render_id}_title`).text(map.title);
    $(`#${map.render_id}_subtitle`).text(map.subtitle);

    $("#map1_title").css({
        "text-align": map.title_horizontal_align,
        "font-size": map.title_font_size + "px",
        "font-family": map.title_font_family,
        "font-weight": map.title_font_weight,
        "max-width": map.width + "px"
    });

    $("#map1_subtitle").css({
        "text-align": map.subtitle_horizontal_align,
        "font-size": map.subtitle_font_size + "px",
        "font-family": map.title_font_family,
        "max-width": map.width + "px"

    });


    //add border color (also outside out map svg) and map alignment
    $("#map1_outer_div").css({
        "border-color": map.container_border_color,
        "margin": map.outer_div_margin
    });



    //set up categories dropdown if enabled
    if (map.categories_dropdown_enabled) {

        $("#map_categories_options_multiselect option:selected").each(function (i, el) {
            map.categories_dropdown_options.push($(el).text());
        });
        setupCategoriesDropdown(map)
    } else {
        $(`#${map.render_id}_categories_dropdown_div`).hide();
    }


    //set up animation controls if enabled
    if (map.animate_map_by != "") {
        setupAnimationControls(map);
    } else {
        $(`#${map.render_id}_animation_controls_div`).hide();
    }


    //set up filter dropdown if enabled
    if (map.filters[0].filter_by_category != "") {
        setupFilterDropdown(map, map.filters[0]);
    } else {
        $(`#${map.render_id}_filter_dropdown_div`).hide();
    }

    //set up secondary filter dropdown if enabled
    if (map.filters[1].filter_by_category != "") {
        setupFilterDropdown(map, map.filters[1]);
    } else {
        $(`#${map.render_id}_secondary_filter_dropdown_div`).hide();
    }

    //reset cached legend min and max, and colorAxis.dataClasses and labels
    colorMap.legend_max = colorMap.legend_min = undefined;
    colorMap.colorAxis_dataClasses = undefined;
    colorMap.legendLabels = undefined;

    if (color_map_next !== false) {

        if (Highcharts.maps[map.map_template] != undefined) {
            colorMap(map);
        } else {

            $("#loading_icon").show();
            let json_url = $("#map_templates_dropdown option:selected").attr("data-json");

            fetch(json_url)
                .then(response => response.json())
                .then(
                    function (data) {
                        Highcharts.maps[map.map_template] = data;
                        colorMap(map);
                        $("#loading_icon").hide();
                    });

        }
    }

    //create color boxes
    if ($("#map_color_by_categories_checkbox").is(":checked") && make_map_next !== false) {
        window.createCategoryColorInputs(map); // in options_controller - relies on map to have been made to look at map.series - calls makeMap again if needed
    }

    //activate editing of datalabels
    initEditableDataLabels(map)


    return map;
}