$(document).ready(function () {


    /*functions for loading in data from a file or URL */


    document.getElementById('import_data_button')
        .addEventListener('change', getFile);


    /* reads, parses, and places the first sheet of an uploaded an excel file using xlsx.min.js */

    function updateXLSInfoDiv(loaded_sheet_name, sheet_names, workbook) {

        $("#XLS_info_label").html(`Sheet <strong>${loaded_sheet_name}</strong> loaded. Choose another sheet: `);

        let optons_html = "";
        sheet_names.forEach(function (name) {
            optons_html += `<option>${name}</option>`;
        });

        $("#XLS_info_dropdown").html(optons_html)
            .val(loaded_sheet_name)
            .unbind()
            .change(function () {
                placeXLS(workbook, $(this).val());
            });

        $("#XLS_info_div").show();

    }

    function placeXLS(workbook, sheet_name) {

        var sheet_obj = XLSX.utils.sheet_to_row_object_array(workbook.Sheets[sheet_name]);

        var table_str = "";

        //table headers
        for (key in sheet_obj[0]) {
            table_str += key + "\t";
        }
        table_str += "\n";

        sheet_obj.forEach(row => {
            var row_str = "";
            for (cell in row) {
                row_str += row[cell] + "\t";
            }
            table_str += row_str.trim() + "\n";
        });

        table_str = table_str;

        $("#import_data_textarea").val(table_str).trigger("blur");
        $("#upload_loading").hide();
        updateXLSInfoDiv(sheet_name, workbook.SheetNames, workbook);

    }


    function processXLS(data) {
        //Read the Excel File data.
        var workbook = XLSX.read(data, {
            type: 'binary'
        });

        var sheet_name = workbook.SheetNames[0];

        placeXLS(workbook, sheet_name);

    }


    function readXLS(file) {
        var reader = new FileReader();
        reader.onload = function (e) {
            processXLS(e.target.result);
        };
        reader.readAsBinaryString(file);
    }



    /*first get file function called */
    function getFile(event) {

        $("#XLS_info_div").hide();

        $("#upload_loading").show(10, function () {
            const input = event.target;
            if ('files' in input && input.files.length > 0) {
                $("#import_data_button").attr("value", input.files[0].name);

                //if Excel file
                if (input.files[0].name.match(".xls")) {
                    readXLS(input.files[0]);
                } else {
                    placeFileContent(document.getElementById('import_data_textarea'), input.files[0]);
                }
            }
        });
    }

    function placeFileContent(target, file) {
        readFileContent(file).then(content => {
            target.value = content;
            $("#upload_loading").hide();
            $("#import_data_textarea").trigger("blur");
        }).catch(error => console.log(error))
    }

    function readFileContent(file) {
        const reader = new FileReader()
        return new Promise((resolve, reject) => {
            reader.onload = event => resolve(event.target.result);
            reader.onerror = error => reject(error);
            reader.readAsText(file);
        })
    }


    //load data from a URL function
    function loadFromURL(URL_input) {

        var URL = URL_input.val();

        if (URL != "") {
            URL_input.val("Loading... ");
            $.ajax({
                url: URL,
                success: function (data) {

                    //if array, convert to tsv
                    if (Array.isArray(data)) {
                        data = data.map(function(row){

                            row = row.map(function(val){
                                    return (val === undefined || val == null || val.length <= 0) ? "&mdash;" : val;
                            });

                            return row.join("\t");
                        }).join("\n");

                        console.log("data", data);
                    };

                    $("#get_csv_from_url_error_message").text("Data Loaded!");
                    URL_input.val(URL);
                    $("#import_data_textarea").val(data).trigger("blur");
                },

                error: function (error) {
                    $("#get_csv_from_url_error_message").text("Loading error! Please check your URL again. If correct, the host could be blocking cross-site access to its data. For help troubleshooting, contact NewMedia@bls.gov (BLS) or odg@dol.gov (DOL main).");
                    URL_input.val(URL);
                }
            });
        } else {
            $("#get_csv_from_url_error_message").text("Please enter a URL");
        }
    }

    //load data from a URL button

    $("#get_csv_from_url_button").click(function () {

        var URL_input = $("#get_csv_from_url_input");
        loadFromURL(URL_input);
    });

    //show data as table when link clicked
    $("#show_data_as_table").click(function () {
        colorMap.showTable(map);
    });

});