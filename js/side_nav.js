//add on like indexOf, but works for reg expressions
Array.prototype.indexOfRegEx = function (regex) {
    let matched_index = -1;
    this.forEach(function (el, i) {
        if (el.match(regex) && matched_index == -1) { //can't break out of .forEach
            matched_index = i;
        }
    });

    return matched_index;
}

const side_nav = {

    set_categories: [],

    /*makes the side nav top menu change what's displayed - called on startup*/
    init: function () {
        $("a.nav_menu_tab").click(function () {
            $("a.nav_menu_tab").removeClass("selected");
            $(this).addClass("selected");
            let selected = $(this).attr("href").slice(1);
            $(".side_nav_content").removeClass("selected");
            $("." + selected).addClass("selected");
        });



        //hide the .side_nav_options_section divs (in the options section) and toggle them open and shut
        $(".side_nav_options_section").hide();
        $(".side_nav_options_section_head").click(function (ev) {
            ev.preventDefault();
            let section = $(this).next(".side_nav_options_section");
            if (section.is(":visible")) {
                $(this).children().html($(this).children().html().replace("−", "+"));
                $("h3", this).attr("aria-label", "Display");
                section.slideUp(100);
            } else {
                $(this).children().html($(this).children().html().replace("+", "−"));
                $("h3", this).attr("aria-label", "Hide");


                section.slideDown(100);
            }
        });


        //question mark popup functionality

        function getOffset(el){
            let rect = el.getBoundingClientRect();
            return {
                left: rect.left + window.scrollX,
                top: rect.top + window.scrollY
            }
        }

        $(".question_popup_anchor").on("mouseenter focus", function (ev) {

            var x_offset = $(this).attr("data-x_offset") || 50;

            var left = getOffset(this).left;
            var top = getOffset(this).top - 50;

            $("#question_popup_div").text($(this).attr("aria-label"))
                .css({
                    left: `${left + parseInt(x_offset)}px`,
                    top: `${top}px`,
                })
                .fadeIn(200);
        });





        $(".question_popup_anchor").on("mouseleave blur", function (ev) {
            $("#question_popup_div").fadeOut(200);
        });


        $(".question_popup_anchor").click(function (ev) {
            ev.preventDefault();
        });

        //make checkboxes checkable also via the enter key (default is spacebar)
        $("input[type=checkbox]").keydown(function(ev){
            if (ev.keyCode === 13){
                $(this).click();
            }
        })

        //smaller tabs functionality
        $(".side_nav_pane:gt(0)").hide();

        $(".side_nav_tabs_ul li").click(function () {
            $(this).addClass("active").attr("aria-label", "Selected");
            $(this).siblings().removeClass("active").attr("aria-label", "Not selected");;

            let panes = $(this).parent().next(".side_nav_panes");
            let index = $(this).index();
            $(".side_nav_pane", panes).fadeOut(200, function () {
                $(".side_nav_pane:eq(" + index + ")", panes).fadeIn(200);
            });
        });

        //checkbox hide/show related div functionality
        $(".toggle_checkbox").change(function () {
            let toggle_elem = document.getElementById($(this).attr("data-rel")); //looks for matching id
            let toggle_classes = $(this).attr("data-rel").split(" "); //class names separated by space

             toggle_classes.forEach(function(toggle_class){
                $("."+toggle_class).each(function(i,e){
                    if ($(e).css("display") != "none"){
                        $(e).hide(100);
                    }else{
                        $(e).show(100);
                    }
                });
             });
   

            if ($(toggle_elem).css("display") != "none") {
                $(toggle_elem).hide(100);
            } else {
                $(toggle_elem).show(100);
            }

        });


        //toggle radio hide/show functionality
        $(".toggle_radio").change(function(e){
            $("> div", $(this).parent("fieldset")).addClass("hidden").hide();
            let show_elem =  document.getElementById($(this).attr("data-rel")); 
            $(show_elem).show();
          //  console.log($(this).attr("data-rel"));
        });


        /* init click event for function for showing field types (map template metadata that data can connect with) */

        $(".show_template_geography_field_types").click(function (ev) {

            ev.preventDefault();

            if ($("#template_geography_field_types_display_div").hasClass("hidden")) {
                $(this).html("&minus; Hide");
                side_nav.showFieldTypes();
            } else {
                $(this).text("+ Show current template's field types and info");
                $("#template_geography_field_types_display_div").hide().addClass("hidden");
            }

        });

        /* hide field div when template is changed */
        $("#map_templates_dropdown").change(function () {
            $("#template_geography_field_types_display_div").hide().addClass("hidden");
            $(".show_template_geography_field_types").text("+ Show current template's field types and info");
        });



        //show what geospatial areas were plotted from the saved data when geospatial_areas_found link is clicked
        $("#geospatial_areas_found_link").click(function () {
            colorMap.showTable(map);
            setTimeout(function () {
                $(".table_popup_div table").remove();

                let not_found_locations = map.notFoundLocations.join("<br>");

                let found_locations = map.foundLocations.join("<br>");

                $(".table_popup_div").append(`<h2>Not found:</h2>${not_found_locations}<br><br><h2>Found:</h2>${found_locations}`);

            }, 1);
        });

    },

    /*function to set individual dropdown if a header is found and that column has more than one subcategory*/
    setSubCategoryDropDown: function (dropdown, categories, dataframe, possibles_arr) {

        for (let i = 0; i < possibles_arr.length; i++) {
            let selected_category = categories[categories.indexOfRegEx(new RegExp(possibles_arr[i], "i"))];
            let sub_categories_length = dataframe.getUniques(selected_category).matrix.length;

            if (selected_category != undefined && sub_categories_length > 1 && !side_nav.set_categories.includes(selected_category)) {
                dropdown.val(selected_category);
                side_nav.set_categories.push(selected_category);
                break;
            };
        }
    },


    /*smart set the joinTo dropdown (picks the field in the map template that the map is joined to values with) */
    setJoinToDropDown: function (dropdown, categories, dataframe) {

        if (categories.indexOfRegEx(new RegExp("fips", "i")) > -1) { //finds things like "state_fips"

            dropdown.val("fips");

        } else if (categories.indexOfRegEx(new RegExp("^state|^county", "i")) > -1) {

            let selected_category = categories[categories.indexOfRegEx(new RegExp("^state|^county", "i"))];
            //asign to postal codes if first value in matching column is 2 chars long
            if (dataframe.getColumn(selected_category).matrix[0].length === 2) {
                dropdown.val("postal-code");
            } else { //else a normal state name
                dropdown.val("name");
            }


        } else {
            dropdown.val(categories[categories.indexOfRegEx(new RegExp("^postal-code|^name|fips|^country|^region", "i"))]);
        }
    },


    /* function to try to smart set some dropdowns - will add dropdowns and animations to map if certain column headers are found */
    smartDropownsSetup: function (categories, dataframe) {
        $("#latitude_category_dropdown").val(categories[categories.indexOfRegEx(new RegExp("^lat", "i"))]);
        $("#longitude_category_dropdown").val(categories[categories.indexOfRegEx(new RegExp("^lon|^lng$|^long$", "i"))]);
        $("#join_map_areas_by_category_dropdown").val(categories[categories.indexOfRegEx(new RegExp("fips|^state|^county|^country|^region|^name", "i"))]);

        side_nav.set_categories = [];

        side_nav.setSubCategoryDropDown($("#map_is_animated_dropdown"), categories, dataframe, ["^year", "^date", "month\b"]);
        side_nav.setSubCategoryDropDown($("#filter_by_category_dropdown"), categories, dataframe, ["categor", "measure", "indust", "^type"]);
        side_nav.setSubCategoryDropDown($("#secondary_filter_by_category_dropdown"), categories, dataframe, ["categor", "measure", "indust", "^type"]);


        $("#map_color_by_category_dropdown").val(categories[categories.indexOfRegEx(new RegExp("^val|^total|^sum|employment|rate", "i"))]);

        side_nav.setJoinToDropDown($("#join_map_areas_to_template_dropdown"), categories, dataframe);
    },


    /*updates what's showing in the dropdowns that use categories from the input data - updated when input is updated */
    updateCategoryDropdowns: function (map) {

        let categories = map.dataframe.getColumnHeads(); //col_index, row_index

        if (JSON.stringify(categories) != JSON.stringify(this.updateCategoryDropdowns.cached_categories)) { //only done if categories are new

            let options_html = "";
            categories.forEach(function (category) {
                options_html += `<option>${category}</option>`;
            });

            $(".categories_dropdown").html(options_html)
                .each(function (i, el) {
                    if ($(el).hasClass("multiselect")) {
                 //       $("option:gt(0)", $(el)).attr("selected", true);
                    }
                })
                .prepend("<option></option>").val('').attr("aria-label", "Empty: None selected");

            /* try to smart set some dropdowns */
            side_nav.smartDropownsSetup(categories, map.dataframe);

            this.updateCategoryDropdowns.cached_categories = categories;
            makeMap();
        }
    },


    /*adds states to the map template dropdown and adds json loading when changed */
    updateMapTemplateDropdown: function () {

        let states = ['Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming']
        let state_codes = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'];

        for (let i = 0; i < states.length; i++) {
            let option = $('<option class="state_template_option">' + states[i] + '</option>')
                .attr("data-json", "https://code.highcharts.com/mapdata/countries/us/us-" + state_codes[i].toLowerCase() + "-all.geo.json")
                .attr("data-type", "state-counties")
                .attr("value", "countries/us/us-" + state_codes[i].toLowerCase() + "-all");

            $("#map_templates_dropdown").append(option);
        }

        // append puerto rico
        $("#map_templates_dropdown").append(' <option data-type="state-counties "data-json="https://code.highcharts.com/mapdata/countries/pr/pr-all-all.geo.json" value="countries/pr">Puerto Rico</option>');
       

    },


    /*function for showing field types (meta data from current template) - when "See current template's field types and info" is clicked, makes a table from Highcharts.maps[map.map_template].*/
    showFieldTypes: function () {

        let fields_obj_arr = [];

        //go through map template
        Highcharts.maps[map.map_template].features.forEach(function (feature, i) {

            if (feature.properties) {
                let properties = feature.properties;

                fields_obj_arr.push({
                    name: properties.name,
                    region: properties.region,
                    fips: properties.fips,
                    "postal-code": properties["postal-code"],
                    GEOID: properties.GEOID
                });
            }

        });


        let fields_matrix = [];

        //headers from first obj
        let top = [];
        for (property in fields_obj_arr[0]) {
            top.push(property.toUpperCase())
        }
        fields_matrix.push(top);

        fields_obj_arr.sort(function (a, b) {
            return a.name === b.name ? 0 : a.name < b.name ? -1 : 1;
        });


        // values from properties of all objs
        fields_obj_arr.forEach(function (field_obj, i) {

            let arr = [];

            for (property in field_obj) {
                arr.push(field_obj[property])
            }

            fields_matrix.push(arr);

        });

        let fields_table = DF(fields_matrix).getHTMLtable();

        $("#template_geography_field_types_display_div").html(fields_table).show().removeClass("hidden");

    }

}