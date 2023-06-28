/*parses a json string and updates the map maker inputs */

function loadSavedSession(json_str) {

    let json = JSON.parse(json_str);

    $("#import_data_textarea").val(json.import_data_textarea);

    side_nav.updateCategoryDropdowns(makeMap(false));

    //remove middle colors
    $(".remove_color_button").click();
    var middle_color_found = false; //this way it will only add middle colors after the second time around
    
    for (key in json) {

        //add middle color if needed
        if (key.match("map_colors_middle_input")){
            if (middle_color_found){
                $(".clone_middle_color_button:last").click();
            }
            middle_color_found = true;
        }

        //assign values to inputs
        var input_elem = $("#" + key);
     //   console.log("key", key);
        if (input_elem.length) {
            if (input_elem.is(':checkbox')) {
                let original_check_status = input_elem.prop("checked");
                input_elem.prop("checked", json[key]);
                let new_check_status = input_elem.prop("checked");
                if (original_check_status!=new_check_status){
                    input_elem.trigger("change");
                }

            } else if (input_elem.is(':radio')) {
                input_elem.prop("checked", json[key]);

                if (json[key] === true){
                    input_elem.trigger("change");
                }

            } else {
                input_elem.val(json[key]);
            }
        }

    }


    //make sure colors are showing as saved
    if ($("#map_legend_dataclasses_checkbox").is(":checked")){
        $(".legend_range_input_span, gradient_legend_options_only").show();
    }else{
        $(".legend_range_input_span, gradient_legend_options_only").hide();
    }

    makeMap();

}