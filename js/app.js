/*app entry function. DOL MapMaker - by Jay McDaniel */

//GLOBALS
let in_map_maker = true;
let map = {};
let map_maker_version = "0.2.19" ;
let saved_area_locations = {}; //loaded from json/metro-lat-lon.json

function main() {

    //update version
    $("#app_version").text(map_maker_version);


    side_nav.init();
    side_nav.updateMapTemplateDropdown();

    //  $.get("./test-data/dummy data - dates.txt", function (result) {
    //      $("#import_data_textarea").val(result);
    //      makeMap(); //load empty map template
    //  })

    $("#import_data_textarea").trigger("blur");


}

/* gets json with metro area lat and lon values - used when fallback to saved locations is enabled */

function getSavedAreaLocations(cb) {

    $.get("json/metro-lat-lon.json", function (data) {
        saved_area_locations = data;
        cb();
    });

}


/* looks for localStorage presets and changes input fields */
function loadDefaultSettings(cb) {
    let default_settings = localStorage.getItem("map_maker_default_settings");

      /*Global datalables position variable */
      window.data_labels_positions = {
        "Vermont": {
            x: 0,
            y: -20
        },
        "Rhode Island": {
            x: 15,
            y: 5
        },
        "Connecticut": {
            x: 5,
            y: 10
        },
        "Delaware": {
            x: 7,
            y: 0
        },
        "New Jersey": {
            x: 5,
            y: 0
        }
    }

    if (default_settings) {
        default_settings = JSON.parse(default_settings);
        //console.log("default_settings", default_settings);

        for (key in default_settings){

            var input_elem = $("#"+key);
            if (input_elem.is(':checkbox')){
                input_elem.prop( "checked", default_settings[key] );
            }else{
                input_elem.val(default_settings[key]);
            }
            
        }
    }

    if (cb) {
        cb();
    }
}


$(document).ready(function () {
    loadDefaultSettings();
    getSavedAreaLocations(main); //call main() after saved areas loaded
});