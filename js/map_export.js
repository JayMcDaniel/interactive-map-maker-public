/* map_export  - builds the export code textarea */


const map_export = {

    compile: function (map) {

        map.render_id = `map${map.title.replace(/[\.\s\,\;\:\(\)]/g,"_")}`;
        map.anchor_id = $("#map_anchor_id_text").val() !== "" ? $("#map_anchor_id_text").val() : map.render_id;

        map.filters[0].initialized = false;
        map.filters[1].initialized = false;
        map.animation_controls_initialized = false;
        map.categories_dropdown_initialized = false;

        //add map template if it came from a loaded json 
        let template_code = "";
        if ($("#map_templates_dropdown option:selected").attr("data-json") != undefined) {
            template_code = `Highcharts.maps["${map.map_template}"] = ${JSON.stringify(Highcharts.maps[map.map_template])};`;
        }



        let supporting_libraries = `
        <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.4.1/jquery.min.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/proj4js/2.3.6/proj4.js"> </script>
        <script src='https://code.highcharts.com/maps/9.2.0/highmaps.js'></script>
        <script src='https://code.highcharts.com/maps/9.2.0/modules/data.js'></script>
        <script src='https://code.highcharts.com/maps/9.2.0/modules/exporting.js'></script>
        <script src='https://code.highcharts.com/maps/9.2.0/modules/offline-exporting.js'></script>
        <script src='https://code.highcharts.com/9.2.0/modules/accessibility.js'></script>
        <script src="https://code.highcharts.com/9.2.0/modules/pattern-fill.js"></script>
        <script src="https://cdn.jsdelivr.net/g/filesaver.js"></script>

        `;

        let html_code = `
            <span class="map_anchor" id="${map.anchor_id}"></span>
            <div class="map_outer_div" id="${map.render_id}_outer_div" style="margin: ${map.outer_div_margin}; width: ${map.width ? "fit-content" : "auto"}; height: ${map.height ? "fit-content" : "auto"}; padding: 10px; border: 2px solid ${map.container_border_color};">
            <h3 id="${map.render_id}_title" style="text-align: ${map.title_horizontal_align}; text-transform: none; color: #112e51; font-size: ${map.title_font_size}px; font-family: ${map.title_font_family}; font-weight: ${map.title_font_weight}; font-style: normal; max-width: ${map.width ? map.width +"px" : "100%"}; ">${map.title}</h3>
            <h4 id="${map.render_id}_subtitle" style="text-align: ${map.subtitle_horizontal_align}; text-transform: none; color: #112e51; font-size: ${map.subtitle_font_size}px; font-family: ${map.title_font_family}; margin-top: -10px; margin-bottom: 20px; max-width: ${map.width ? map.width +"px" : "100%"}; display: ${map.subtitle !== '' ? "block" : "none"};">${map.subtitle}</h4>

            ${$("#map_maker_controls").html().replace(/map1/g, map.render_id)}
            <div id="${map.render_id}_inner_div" style="width: fit-content; height: fit-content; margin: auto;"></div>
            </div>
        `;

        let map_js_code = `
            (function($){
                ${dataFramer.toString()};
                dataFramer(jQuery);

                ${template_code}

                let map = ${JSON.stringify(map).replace(/map1_/g, map.render_id + "_")};
 
                ${colorMap.toString()}

                $(document).ready(function(){

                    if(map.data_url !== null){

                        $.ajax({
                            url: map.data_url,
                            success: function(data){

                                //if array, convert to tsv
                                if (Array.isArray(data)) {
                                    data = data.map(function(row){
                                        row = row.map(function(val){
                                            return (val === undefined || val == null || val.length <= 0) ? "&mdash;" : val;
                                        });
                                        return row.join("\\t");
                                    }).join("\\n");
                                };
            
                                map.dataframe = DF(DF.convertToTSV(data));
                                colorMap(map);
                                console.log("success loading of data");
                            },
                
                            error: function(error){
                                map.dataframe = DF(map.dataframe.matrix);
                                colorMap(map);
                                console.log("error loading data", error);
                            }
                        });


                    }else{
                        map.dataframe = DF(map.dataframe.matrix);
                        colorMap(map);

                    }
                });
            })(jQuery);
        `;

        let css_code = `
        <link rel="stylesheet" href="https://www.bls.gov/stylesheets/bls_tables.css">
        <style>
 
    /*custom css*/

                    .map_outer_div {
                        width: fit-content !important;
                        height: fit-content !important;
                    }
            
                    .map_outer_div input[type="range"] {
                        -webkit-appearance: none;
                        -moz-appearance: none;
                        appearance: none;
                        background-color: transparent;
                    }
                    
                    .map_outer_div input[type="range"]::-webkit-slider-runnable-track {
                        -webkit-appearance: none;
                        appearance: none;
                        height: 10px;
                        background: #112e51;
                    
                    }
                    
                    .map_outer_div input[type="range"]::-webkit-slider-thumb {
                        -webkit-appearance: none;
                        appearance: none;
                        border: 2px solid #112e51; 
                        border-radius: 50%;
                        height: 20px;
                        width: 20px;
                        position: relative;
                        bottom: 8px;
                        background: #ce1c00;
                        box-shadow: 0px 3px 5px 0px rgba(0, 0, 0, 0.4);
                        cursor: grab;
                        margin-top: .1rem
                    }

                    .map_outer_div input[type="range"]:focus::-webkit-slider-thumb {
                        border: 1px solid #0096FF;
                        outline: 3px solid #0096FF;
                        outline-offset: 0.125rem;
                      }

                    .map_outer_div .animation_button {
                        position: relative;
                        bottom: -2px;
                        z-index: 400;
                        margin-top: 0px;
                    }

                    ul.highcharts-menu li.highcharts-menu-item{
                        line-height: 10px !important;
                    }

                    ul.highcharts-menu hr{
                        height: 1px;
                        background-color: #000;
                        margin: 1em 0em;
                    }
                                   
                    .map_categories_dropdown option:first-child{
                        font-weight: normal;
                    }

                    .table_popup_div {
                        display: block;
                        height: 100%;
                        width: 100%;
                        overflow: scroll;
                        background-color: rgb(255,255,255);
                        position: fixed;
                        top: 0px;
                        left: 0px;
                        padding: 20px;
                        z-index: 5000;
                    }


                    .close_popup{
                        font-size: 1.4em;
                        color: #e31c3d;
                        margin-bottom: 9px;
                        cursor: pointer;
                    }

                    .close_popup:focus, .close_popup:focus-visible{
                        outline: 2px solid rgba(0,0,255,0.651) !important;
                    }
  
        </style>
        `;

        let export_code = `
            ${supporting_libraries}

            ${css_code}

            ${html_code}

            <script>
            ${map_js_code}
            </script>

        `;

        let snippet_code = `

            ${css_code}

            ${html_code}
            
            <script>
            ${map_js_code}
            </script>
        `;

        let js_css_code = `

            ${css_code}
            
            <script>
            ${map_js_code}
            </script>
        `;

        $("#export_map_textarea").val(export_code);

        setTimeout(function () {
            $("#snippet_export_map_textarea").val(snippet_code);
            $("#js_snippet_export_map_textarea").val(map_js_code);
            $("#html_snippet_export_map_textarea").val(html_code);
            $("#js_css_snippet_export_map_textarea").val(js_css_code);

        }, 10);

        map.render_id = "map1" //reset to mapmaker default
        makeMap(); //resets some defaults/bindings

    },

    getFileName: function (filename_input_id) {
        var filename = $("#" + filename_input_id).val() != "" ? $("#" + filename_input_id).val() : undefined;

        filename = filename != undefined ? filename :
            map.title == "" ? "map" : map.title.replace(/[ \,\;\(\)]/g, "_");

        return filename;
    },


    getExportData: function (map, textarea_id, filename_input_id) {
        var input = $("#" + textarea_id);
       
        var filename = this.getFileName(filename_input_id);

        return {
            data: input.val(),
            filename: filename,
            extension: input.attr("data-extension") ? input.attr("data-extension") : ".txt"
        }
    },

    download: function (map, textarea_id, filename_input_id) {
        var export_data = this.getExportData(map, textarea_id, filename_input_id);
        var file = new File([export_data.data], `${export_data.filename}${export_data.extension}`, {
            type: "text/plain;charset=utf-8"
        });
        saveAs(file);
    },

    copyToClipboard: function (textarea, copy_button) {
        textarea.select();
        document.execCommand("copy");
        copy_button.html("Copied!");
        setTimeout(function () {
            copy_button.html("Copy to clipboard");
        }, 10000);
    },

    downloadHTML: function (map, textarea_id, filename_input_id) {
        var export_data = this.getExportData(map, textarea_id, filename_input_id);

        var export_html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${export_data.filename}</title>
        </head>
        <body>
              ${export_data.data}
        </body>
        </html>
        `

        var file = new File([export_html], `${export_data.filename}.html`, {
            type: "text/plain;charset=utf-8"
        });
        saveAs(file);
    },

    //downloads text as a .json file
    downloadJSON: function (map, text, filename_input_id) {

        var filename = this.getFileName(filename_input_id);

        var file = new File([text], `${filename}.json`, {
            type: "text/plain;charset=utf-8"
        });
        saveAs(file);
    },


    //saves the mapmaker inputs into json form
    saveMapMakerStatus: function () {

        let status_json = {};

        $("input, select, textarea").not(":button, :file, .no_save").each(function () {

            let key = $(this).attr("id");
            let val = $(this).is(':checkbox, :radio') ? $(this).is(":checked") : $(this).val();

            status_json[key] = val;
        });

        $("#saved_status_textarea").val(JSON.stringify(status_json));
    },


    //saves to local storage certain input fields with class of localStorage
    saveDefaultSettings: function () {
        let default_settings = {};

        $(".localStorage").each(function (i, e) {
            let val = $(e).is(':checkbox') ? $(e).is(":checked") : $(e).val();
            default_settings[$(e).attr("id")] = val;

        });

        localStorage.setItem("map_maker_default_settings", JSON.stringify(default_settings));
    }

}

//initialization
$(document).ready(function () {

    $("#export_tab").click(function () {
        $("#map1_animation_slider").val(map.animation_start_index).trigger("reset"); //reset animation slider to start index
        map_export.compile(map);
        map_export.saveMapMakerStatus();
        map_export.saveDefaultSettings();
    });

    $(".download_text").click(function () {
        map_export.download(map, $(this).attr("data-rel-textarea"), $(this).attr("data-rel-filename")); //map, code text area, related filename text area
    });


    $("#download_export_map_as_html_page").click(function () {
        map_export.downloadHTML(map, "export_map_textarea", $(this).attr("data-rel-filename"));
    });

    //download saved state as json
    $("#download_saved_status, #save_progress_button").click(function (ev) {
        ev.preventDefault();
        map_export.saveMapMakerStatus();
        map_export.downloadJSON(map, $("#saved_status_textarea").val(), $(this).attr("data-rel-filename"));
        map_export.saveDefaultSettings();
    });

    //copy to clipboard button
    $(".copy_code_button").click(function (ev) {
        ev.preventDefault();
        let textarea = $(this).next("textarea");
        map_export.copyToClipboard(textarea, $(this)); //"this" to change copy button text 
    });

})