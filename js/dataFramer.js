/*dataFramer.js - a table filter and getter tool - Jay McDaniel */
function dataFramer($) {
    /*converts a tab separated string table to a matrix (array of arrays) */
    function TSVtoMatrix(input) {
        let matrix = input.trim().split("\n");
        
        matrix[0] = $.trim(matrix[0]);
        for (let i = 0; i < matrix.length; i++) {
            matrix[i] = matrix[i].trimLeft().split("\t");
        }
        //trim all cells
        for (let i = 0; i < matrix.length; i++) {
            for (let j = 0; j < matrix[i].length; j++) {
                matrix[i][j] = matrix[i][j].trim().replace(/ +/g, " ");
            }
        }
        //fill in missing values in last array if needed
        while (matrix.slice(-1)[0].length < matrix[0].length) {
            matrix[matrix.length - 1].push("");
        }
        // console.log("matrix", matrix);
        return matrix;
    }

    //returns a val or 0
    function forceVal(val) {
        if (typeof val === "number") {
            return val;
        }
        if (val == undefined) {
            return 0;
        }
        val = val.replace(/,/g, "").replace("$", "").replace("%", "");
        return !isNaN(Number(val)) ? Number(val) : 0;
    }

    /*DataFrame class, returned with DF(string)*/
    class DataFrame {
        constructor(input) {
            if (Array.isArray(input)) {
                this.matrix = input;
            } else if (typeof input === "string") {
                this.matrix = TSVtoMatrix(input);
            } else {
                console.warn("Error: input needs to be a string or array");
                this.matrix = [];
            }
        }

        /*GET functions*/
        getData() {
            return this.matrix;
        }

        //returns index number value of a column head
        getColumnIndex(selected) {
            return typeof selected === "number" ? selected : this.matrix[0].indexOf(selected);
        }

        //returns array of column headers, or a single column header if index is passed
        getColumnHeads(col_index, row_index = 0) {
            return col_index != undefined ? this.matrix[row_index][col_index] : this.matrix[row_index];
        }

        //returns a new DataFrame obj with an array of values from the specified column. accepts an index or a column name
        getColumn(selected, header = false) {
            let index = this.getColumnIndex(selected);
            let column = [];
            if (index > -1) {
                column = this.matrix.map(arr => arr[index]);
            } else {
                console.warn("Column index or name not found: ", selected, this.matrix);
            }
            //let column = index > -1 ? this.matrix.map(arr => arr[index]) : "Column index or name not found";
            return header ? DF(column) : DF(column.slice(1));
        }

        //returns a new DataFrame obj with only the columns specified. Accepts an array of column names
        getColumns(selected_arr, header = false) {
            if (Array.isArray(selected_arr)) {
                var self = this;
                return DF(selected_arr.map(function(selected, i) {
                    return self.getColumn(selected, header).matrix;
                }));
            } else {
                console.warn("Error: DataFrame.getColumns() expects an array as the first argument");
                return DF("");
            }
        }

        //removes a column, given an index or column header name
        removeColumn(selected) {
            let index = this.getColumnIndex(selected);
            let new_matrix = [];
            for (let i = 0; i < this.matrix.length; i++) {
                new_matrix.push(this.matrix[i].slice(0, index).concat(this.matrix[i].slice(index + 1, this.matrix[i].length)))
            }
            return DF(new_matrix);
        }

        //returns a new DataFrame obj without the columns specified to be removed. Accepts an array of column names
        removeColumns(selected_arr) {
            if (Array.isArray(selected_arr)) {
                let matrix_copy = $.extend(true, [], this.matrix);
                for (let i = 0; i < selected_arr.length; i++) {
                    let index = this.getColumnIndex(selected_arr[i]);
                    for (let j = 0; j < matrix_copy.length; j++) {
                        matrix_copy[j][index] = "<REMOVE_CELL>";
                    }
                }
                return DF(matrix_copy.map(function(arr) {
                    return arr.filter(function(val) {
                        return val != "<REMOVE_CELL>";
                    });
                }));
            } else {
                console.warn("Error: DataFrame.removeColumns() expects an array as the first argument");
                return DF("");
            }
        }

        //Filters - returns only the rows where the value in the specified column is a match, or evaluates a function as a filter
        filterByColumn(selected_column, filter, regexp = false) {
            let index = this.getColumnIndex(selected_column);
            if (typeof filter === "function") {
                return DF(this.matrix.filter(function(arr, i) {
                    return i === 0 || filter(arr[index]);
                }));
            } else if (typeof filter === "string") {
                if (regexp) {
                    var string_re = new RegExp(filter, "i");
                    return DF(this.matrix.filter(function(arr, i) {
                        return i === 0 || arr[index].match(string_re);
                    }));
                } else {
                    return DF(this.matrix.filter(function(arr, i) {
                        return i === 0 || arr[index] === filter;
                    }));
                }
            } else {
                console.warn("DataFrame.filterByColumn expects a column name or index as the first argument, and either a string to match, or a function to filter with for the second argument");
                return DF("");
            }
        }

        //returns an index number for a row (if a name is passed, it will return the first index found)
        getRowIndex(selected) {
            return typeof selected === "number" ? selected : this.rowHeads().matrix.indexOf(selected);
        }

        //returns a new DataFrame obj with an array of row headers, or a single row header if index is passed
        rowHeads(index) {
            return index != undefined ? this.matrix[index][0] : DF(this.matrix.map(arr => arr[0]));
        }

        //returns a new DataFrame obj with an array of values from the specified row. Accepts an index or a row name
        getRow(selected) {
            let index = this.getRowIndex(selected);
            if (index > -1) {
                return DF(this.matrix[index]);
            } else {
                console.warn("Row index or name not found");
                return DF("");
            }
            //  return index > -1 ? DF(this.matrix[index]) : "Row index or name not found";
        }

        //returns a new DataFrame obj with a matrix of selected rows. Accepts an array of indexes / rowNames, or from and a to index to go in a splice()
        getRows(selected_1, selected_2, has_headers = false) {
            let column_headers = has_headers === true ? matrix_copy.shift() : undefined;
            if (arguments.length === 0) {
                return DF(this.matrix.slice(1));
            }
            let new_matrix = [];
            if (Array.isArray(selected_1)) {
                let selected_arr = selected_1;
                for (let i = 0; i < selected_arr.length; i++) {
                    if (typeof selected_arr[i] === "number") {
                        new_matrix.push(this.matrix[selected_arr[i]]);
                    } else {
                        let these_rows = this.matrix.filter(function(arr) {
                            return arr[0] === selected_arr[i];
                        });
                        new_matrix.push(these_rows);
                    }
                }
            }
            if (typeof selected_1 === "number") {
                new_matrix = this.matrix.slice(selected_1, selected_2);
            }
            if (column_headers) {
                new_matrix.unshift(column_headers);
            }
            return DF(new_matrix);
        }

        //removes a row, given an index or row header name
        removeRow(selected) {
            let index = this.getRowIndex(selected);
            let matrix_copy = $.extend(true, [], this.matrix);
            matrix_copy.splice(index, 1);
            return DF(matrix_copy);
        }

        //removes rows, given an arrary of indexes or row header names
        removeRows(selected_arr) {
            if (Array.isArray(selected_arr)) {
                let matrix_copy = $.extend(true, [], this.matrix);
                for (let i = 0; i < selected_arr.length; i++) {
                    let index = this.getRowIndex(selected_arr[i]);
                    for (let j = 0; j < matrix_copy.length; j++) {
                        delete matrix_copy[index];
                    }
                }
                return DF(matrix_copy.filter(function(arr) {
                    return arr != undefined;
                }));
            } else {
                console.warn("Error: DataFrame.removeRows() expects an array as the first argument");
                return DF("");
            }
        }

        //accepts options obj, with sort_order (accepts desc or <default>asc), sort_type as "alpha" or <default>"numeric" a sort_by as index <default>0 or column name, has_headers <default>true to keep column headers in place
        sort(options) {
            let sort_order = options.sort_order || "asc";
            let sort_type = options.sort_type || "numeric";
            let has_headers = options.has_headers != undefined ? options.has_headers : true;
            let sort_by = options.sort_by;
            let sort_column_index = sort_by != undefined ? this.getColumnIndex(sort_by) : 0;
            let matrix_copy = $.extend(true, [], this.matrix);
            let column_headers = has_headers === true ? matrix_copy.shift() : undefined;
            matrix_copy.sort(function(a, b) {
                if (sort_type === "alpha") {
                    return a[sort_column_index] - b[sort_column_index];
                } else {
                    return Number(a[sort_column_index]) - Number(b[sort_column_index]);
                }
            })
            if (sort_order === "desc") {
                matrix_copy.reverse();
            }
            if (column_headers) {
                matrix_copy.unshift(column_headers);
            }
            return DF(matrix_copy);
        }

        /*math operations*/
        //sums values from a selected column. If you want to sum a row, use .getRow() first then sum()
        sum(selected_column, options) {
            options = options || {};
            let group_by = options.group_by;
            let decimals = options.decimals != undefined ? options.decimals : 1;
            let has_headers = options.has_headers != undefined ? options.has_headers : true;
            let return_headers = options.return_headers != undefined ? options.return_headers : true;
            let column_index = this.getColumnIndex(selected_column);
            if (group_by != undefined) {
                let group_by_index = this.getColumnIndex(group_by);
                let start_index = 0;
                let headers = null;
                if (has_headers) {
                    start_index = 1;
                    headers = [this.matrix[0][group_by_index], this.matrix[0][column_index]];
                }
                let group_sum = {}
                for (let i = start_index; i < this.matrix.length; i++) {
                    let this_row = this.matrix[i];
                    let this_group = this_row[group_by_index];
                    let value = forceVal(this_row[column_index]);
                    if (!group_sum[this_group]) {
                        group_sum[this_group] = {
                            index: i,
                            value: value
                        }
                    } else {
                        group_sum[this_group].value += value;
                    }
                }
                //change obj back into matrix
                var new_matrix = []
                for (let key in group_sum) {
                    let o = group_sum[key];
                    new_matrix.push([o.index, key, o.value]);
                }
                new_matrix = new_matrix.sort(function(a, b) {
                    return (a - b);
                }).map(function(arr) {
                    return arr.slice(1); //removes the sorting index
                })
                if (headers && return_headers) {
                    new_matrix.unshift(headers);
                }
                return DF(new_matrix);
            }
            //else if not grouped
            var arr = selected_column != undefined ? this.getColumn(selected_column).matrix : this.matrix.flat();
            console.log(arr);
            var sum = 0;
            if (arr.length > 0) {
                sum = arr.reduce(function(a, b) {
                    return forceVal(a) + forceVal(b);
                });
            }
            return Number(sum.toFixed(decimals));
        }

        //returns average of a selected column
        avg(selected_column, decimals = 1) {
            return Number((this.sum(selected_column, decimals) / this.getColumn(selected_column).matrix.length).toFixed(decimals));
        }

        //Returns a new DF with a transposed matrix
        transpose() {
            return DF(this.matrix[0].map((_, colIndex) => this.matrix.map(row => row[colIndex])));
        }

        //given a selected column, returns array of unique values
        getUniques(selected_column) {
            var arr = selected_column != undefined ? this.getColumn(selected_column).matrix : this.matrix.flat();
            var uniques_arr = [...new Set(arr)];
            return DF(uniques_arr);
        }

        //returns an HTML table from a DF
        getHTMLtable() {
            var rows = this.matrix.map(function(arr, i) {
                if (i === 0) {
                    return "<th scope='col'>" + arr.join("</th><th scope='col'>") + "</th>"
                } else {
                    return "<td>" + arr.join("</td><td>") + "</td>";
                }
            });
            console.log("rows", rows);
            rows = rows.map(function(row, i) {
                    var greenbar = i % 2 == 0 ? "greenbar" : "";

                    row = row.replace("<td>","<th>").replace("</td>","</th>") //replace the first td cell with a th for 508

                    if (i === 0) {
                        return "<thead><tr>" + row + "</tr></thead>";
                    }
                    if (i === 1) {
                        return "<tbody><tr>" + row + "</tr>";
                    }
                    if (i === rows.length - 1) {
                        return "<tr class='" + greenbar + "'>" + row + "</tr></tbody>";
                    } else {
                        return "<tr class='" + greenbar + "'>" + row + "</tr>";
                    }
                })
                .join(" ");
            return "<table class='regular'>" + rows + "</table>";
        }
    }

    //function wrapper that returns a new DataFrame instance
    window.DF = function(input) {
        return new DataFrame(input);
    }

    //returns a new DataFrame object with its matrix made from a load from TSV url
    DF.fromTSV = function(url) {
        var result = null;
        $.ajax({
            url: url,
            type: 'get',
            dataType: 'html',
            async: false,
            success: function(data) {
                result = data;
            }
        });
        return DF($.trim(result));
    }
    
    /*converts CSV and pipe-delimited to TSV - used on input value to get ready to make a matrix from TSV */
    DF.convertToTSV = function(val) {
        if (/\t/.test(val)) {
            return val;
        } else if (/\|/.test(val)) {
            val = val.replace(/\|/g, "\t");
        } else {
            var in_quotes = false;
            for (var i = 0; i < val.length; i++) {
                if (/\"/.test(val[i])) {
                    in_quotes = in_quotes === true ? false : true;
                }
                if (val[i] === ',' && !in_quotes) {
                    val = val.substring(0, i) + "\t" + val.substring(i + 1);
                    // console.log("making tab");
                }
            }
            val = val.replace(/\"/g, "");
        }
        return val;
    }
}
dataFramer(jQuery);