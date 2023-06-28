/*options_controller controls what triggers from the map options and any special parsing - then calls the makeMap function to update the map */
$(document).ready(function () {

    //rgb to hex function
    function componentToHex(c) {
        var hex = c.toString(16);
        return hex.length == 1 ? "0" + hex : hex;
    }

    function rgbToHex(r, g, b) {
        return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
    }

    /*delay function so something is triggered only after the user stops typing for a bit */
    let delay = (function () {
        let timer = 0;
        return function (callback, ms) {
            clearTimeout(timer);
            timer = setTimeout(callback, ms);
        };
    })();


    $("input, select").not("#import_data_button, #map_outer_div select, #map_outer_div input, .drawing_input, #map_height_input, #map_width_input, #map_centered_checkbox").change(function () {
        makeMap();
    });


    $('textarea, input').not("#export_map_textarea, #map_height_input, #map_width_input").keyup(function () {
        delay(function () {
            makeMap();
        }, 700);
    });

    //update code for size and anchor id changes
    $("#map_height_input, #map_width_input, #map_centered_checkbox, #map_anchor_id_text").on("input", function () {
        map_export.compile(map); //makeMap called in here
        map_export.saveMapMakerStatus();
    });

    $("#map1_title").blur(function () {
        $("#map_title_input").val($(this).text());
        makeMap();
    });

    //import data box
    $("#import_data_textarea").on("blur paste", function (ev) {
        let val = $(this).val();

        if (val.charAt(0) === "{") {
            loadSavedSession(val);
        } else {
            side_nav.updateCategoryDropdowns(makeMap());
        }
    });

    //update data input button
    $("#update_input_button").click(function (ev) {
        ev.preventDefault();
        $("#import_data_textarea").trigger("blur");
    });

    //clear input textarea function
    $("#clear_input_button").click(function () {
        $("#import_data_textarea").val("").trigger("blur");
    });


    //color scheme selection
    $(".color_scheme").click(function () {
        if ($(this).hasClass("selected")) {
            $(this).removeClass("selected");
        } else {
            $(".color_scheme").removeClass("selected");
            $(this).addClass("selected");

            $(".middle_color_div:gt(0)").remove();

            let colors_arr = $(this)[0].style.background.split("rgb").slice(1).map(function (el) {
                return el.split(")")[0].replace("(", "");
            });

            colors_arr.forEach(function (color, i) {
                let c = color.split(",").map(str => Number(str));
                let hex_color = rgbToHex(c[0], c[1], c[2]);

                $(`.map_legend_color_input:eq(${i})`).val(hex_color);
                makeMap();
            });


        }
    });

    //make color scheme divs keyboard accesible
    $(".color_scheme").keydown(function(ev){
        if (ev.keyCode === 13 || ev.keyCode === 32){ //enter or spacebar
            $(this).click();
        } 
    });

    //rename text
    function renameMidText(){
        $(".mid_text").each(function(i,e){
            $(e).text("Mid " + Number(i + 1));
        });
        $(".middle_color_div").each(function(i,e){
            $(e).attr("id", "middle_color_div_" + Number(i + 1));

            $("input.map_legend_color_input", $(e)).attr("id", "map_colors_middle_input_" + Number(i + 1));
            $("input.from_input", $(e)).attr("id", "map_colors_middle_from_input_" + Number(i + 1)).attr("aria-label", "Insert 'from' value for mid color " + Number(i + 1));
            $("input.to_input", $(e)).attr("id", "map_colors_middle_to_input_" + Number(i + 1)).attr("aria-label", "Insert 'to' value for mid color " + Number(i + 1));;


            $("label", $(e)).attr("for", "map_colors_middle_input_" + Number(i + 1));
        });

    }


    //remove color div button
    function bindRemoveColorDivs() {
        $(".remove_color_button").unbind().click(function () {
            $(this).parents(".middle_color_div").remove();
            makeMap();
            renameMidText();
        });
    }

    //middle color clone button
    function middleColorClone() {

        $(".clone_middle_color_button").unbind().click(function (e) {

            e.preventDefault();
            let middle_color_div_clone = $(this).parents(".middle_color_div").clone();
              
            $(".clone_color_buttons", middle_color_div_clone).html('<a href="#" class="clone_middle_color_button" aria-label="Add specific mid values">(+)</a> <a href="#" class="remove_color_button" aria-label="Remove specific mid values">(&minus;)</a>');

            middle_color_div_clone.insertAfter($(this).parents(".middle_color_div"))
                .change(function () {
                    makeMap();
                });

            renameMidText();
                
            
            //rebind new buttons
            bindRemoveColorDivs();
            middleColorClone(); 

        });
    }

    middleColorClone();


    //Data field contains categories checkbox creates color inputs for the categories
    window.createCategoryColorInputs = function (map) {

      
            let colors = ['#FF6633', '#FFB399', '#FF33FF', '#FFFF99', '#00B3E6',
                '#E6B333', '#3366E6', '#999966', '#99FF99', '#B34D4D',
                '#80B300', '#809900', '#E6B3B3', '#6680B3', '#66991A',
                '#FF99E6', '#CCFF1A', '#FF1A66', '#E6331A', '#33FFCC',
                '#66994D', '#B366CC', '#4D8000', '#B33300', '#CC80CC',
                '#66664D', '#991AFF', '#E666FF', '#4DB3FF', '#1AB399',
                '#E666B3', '#33991A', '#CC9999', '#B3B31A', '#00E680',
                '#4D8066', '#809980', '#E6FF80', '#1AFF33', '#999933',
                '#FF3380', '#CCCC00', '#66E64D', '#4D80CC', '#9900B3',
                '#E64D66', '#4DB380', '#FF4D4D', '#99E6E6', '#6666FF'
            ];

            var category_color_inputs = "";

            for (var i = 0; i < map.series.length; i++) { 

                let color = map.colors[i] || colors[i];

                category_color_inputs += `
                <label for="map_category_color_input_${i}">${map.series[i].name}:</label>
                <br>
                <input type="color" id="map_category_color_input_${i}" value="${color}" class="map_category_color_input" /><br>
                `;

            }

            $("#color_by_categories_div").html(category_color_inputs);
            $(".map_category_color_input").change(function(){
                makeMap();
            });

            makeMap(true, false); //(color_map_next, make_map_next)

    }



    
    //activate editing of datalabels
    window.initEditableDataLabels = function(map) {

        var original_pos = {};
        var original_transform = {};
        var new_offset = {};

        $(".highcharts-data-label").unbind().mousedown(function (ev) {
            $(this).attr("stroke", "blue");

            original_pos = {
                x: ev.originalEvent.x,
                y: ev.originalEvent.y
            };


            var this_transform = $(this).attr("transform");
            var parts = /translate\(\s*([^\s,)]+)[ ,]([^\s,)]+)/.exec(this_transform);
           
            original_transform = {
                x: Number(parts[1]),
                y: Number(parts[2])
            };


            $(this).mousemove(function (move_ev) {
                
                new_offset = {
                    x: move_ev.originalEvent.x - original_pos.x,
                    y: move_ev.originalEvent.y - original_pos.y
                };

                var new_transform = {
                    x: original_transform.x + new_offset.x,
                    y: original_transform.y + new_offset.y
                }

                $(this)[0].setAttribute('transform', 'translate(' + new_transform.x + ',' + new_transform.y + ')');
            })

            //reset on mouseup, and set the offesets in map obj
            $(this).mouseup(function () {
                $(this).attr("stroke", "none");
                $(this).unbind("mousemove");
                initEditableDataLabels(map);

                var this_classes = $(this).attr("class").split(" ");
                var area_name = this_classes[this_classes.length-1].replace("_datalabel","");
                map.data_labels.positions[area_name] = {x:new_offset.x, y: new_offset.y};
                window.data_labels_positions = map.data_labels.positions;
            });

            $(".highcharts-data-label").unbind("mousedown");

        })

    }


    //reset default settings button
    function resetDefaultSettings() {
        let default_settings = {
            "map_title_horizontal_align": "center",
            "map_title_font_size": "18",
            "map_title_font_family": "'Merriweather', serif",
            "map_title_font_bold_checkbox": "true",
            "map_subtitle_horizontal_align": "center",
            "map_subtitle_font_size": "12",
            "map_caption_vertical_align": "bottom",
            "map_caption_horizontal_align": "left",
            "map_credits_input": "Department of Labor",
            "map_area_border_color_input": "#333333",
            "map_container_border_color_input": "#112e51",
            "map_legend_title_font_size": "14",
            "map_legend_values_font_size": "11",
            "map_legend_background_color": "#ffffff",
            "map_legend_border_color": "#ffffff",
            "map_legend_title_text_color": "#000",
            "map_legend_values_text_color": "#666"

        };

        localStorage.setItem("map_maker_default_settings", JSON.stringify(default_settings));
        loadDefaultSettings(makeMap); //makeMap() on callback
    }

    $("#reset_default_settings_button").click(function (e) {
        e.preventDefault();
        resetDefaultSettings();
    });


});