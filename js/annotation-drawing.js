let current_tool = {
    is_active: false
};


$(document).ready(function () {

    var svgns = "http://www.w3.org/2000/svg";

    window.current_tool = current_tool;

    let drawing_settings = {};

    /* parent class DrawingTool */
    class DrawingTool {
        constructor(options = {}) {
            this.fill = options.fill || drawing_settings.fill || "none";
            this.stroke = options.stroke || drawing_settings.stroke || "black";
            this["stroke-width"] = options["stroke-width"] || drawing_settings[
                    "stroke-width"] ||
                "2";
            this.id = options.id || drawing_settings.id || null;
            this.class = options.class || "drawn_element";
            this["fill-opacity"] = options["fill-opacity"] || drawing_settings[
                    "fill-opacity"] ||
                "1";
            this.cursor = "crosshair";
            this.is_active = true;
            this.no_wrap_in_svg = options.no_wrap_in_svg;

        }

        setID(svg_elem) {
            if (this.id) {
                svg_elem.setAttribute("id", this.id);
            }
        }

        setClass(svg_elem) {
            svg_elem.setAttribute("class", this.class);
        }

        shelve() {
            current_tool = null;
        }

        setAttributes(svg_elem, obj) {
            for (let key in obj) {
                svg_elem.setAttributeNS(null, key, obj[key]);
            }
            this.setID(svg_elem);
            this.setClass(svg_elem);
            return svg_elem;
        }


        insertElement(element, event, options) {

            element.addEventListener("click", function (ev) {
                drawingClicked(element, ev);
            });

            element.addEventListener("keyup", function (ev) {
                moveElement(element, ev);
            });


            if (this.no_wrap_in_svg) {
                event.currentTarget.appendChild(element);

            } else {

                var inner_svg = document.createElementNS(svgns, 'svg');
                this.setAttributes(inner_svg, {
                    x: "0",
                    y: "0",
                });


                inner_svg.appendChild(element);
                event.currentTarget.appendChild(inner_svg);

            }

            selectElem(element);
        }

    }



    /* Point Tool */
    class PointTool extends DrawingTool {
        constructor(options = {}) {
            super(options);
            this.type = "point";
            this.r = options.r || drawing_settings.r;
        }

        draw(event) {
            deselectDrawings();

            console.log("draw", event);
            this.x = event.offsetX;
            this.y = event.offsetY;

            var circle = document.createElementNS(svgns, 'circle');

            this.setAttributes(circle, {
                'cx': this.x,
                'cy': this.y,
                'fill': this.fill,
                'r': this.r,
                'stroke': this.stroke,
                'stroke-width': this["stroke-width"],
                'fill-opacity': this["fill-opacity"]
            });

            this.insertElement(circle, event);

        }
    }



    /*Line Tool */
    class LineTool extends DrawingTool {
        constructor(options = {}) {
            super(options);
            this.type = "line";
            this.points_down = options.points_down || 0;
            this.x1 = options.x1;
            this.y1 = options.y1;
            this["stroke-width"] = drawing_settings["stroke-width"] || options[
                "stroke-width"] || 1;

        }

        draw(event) {

            deselectDrawings();


            //first point down
            if (!this.points_down) {

                this.x1 = this.x1 || event.offsetX;
                this.y1 = this.y1 || event.offsetY;

                let line_start = new PointTool({
                    r: 1,
                    class: "temp",
                    no_wrap_in_svg: true
                }).draw(event); //put down start - temp
                this.points_down++;
            } else {

                var line = document.createElementNS(svgns, 'line');

                this.x2 = event.offsetX;
                this.y2 = event.offsetY;

                if (event.shiftKey) { //draw straight horiz or vert line when shift is held
                    var dif_x = Math.abs(this.x1 - this.x2);
                    var dif_y = Math.abs(this.y1 - this.y2);

                    if (dif_x > dif_y) {
                        this.y2 = this.y1;
                    } else {
                        this.x2 = this.x1;
                    }

                }


                this.setAttributes(line, {
                    'x1': this.x1,
                    'y1': this.y1,
                    'x2': this.x2,
                    'y2': this.y2,
                    'stroke': this.stroke,
                    'stroke-width': this["stroke-width"]
                });


                this.insertElement(line, event);

                //don't get newTool - just reset
                this.x1 = this.y1 = undefined;
                this.points_down = 0;

            }

        }
    }




    /* Path (custom shape) Tool */

    class PathTool extends DrawingTool {
        constructor(options = {}) {
            super(options);
            this.type = "path";
            this.points_down = 0;
            this.x1 = undefined;
            this.y1 = undefined;
            this.path_str = "";

        }

        draw(event) {
            deselectDrawings();

            this.x = event.offsetX;
            this.y = event.offsetY;

            //first point down
            if (!this.points_down) {

                //start spot
                let line_start = new PointTool({
                    r: 1,
                    class: "temp"
                }).draw(event); //put down start - temp

                this.firstX = this.x;
                this.firstY = this.y;
                this.path_str += `M${this.x} ${this.y}`;
                this.points_down++;

            } else {

                var temp_path_line = new LineTool({
                        class: "temp",
                        points_down: this.points_down,
                        x1: this.lastX || this.firstX,
                        y1: this.lastY || this.firstY,
                        no_wrap_in_svg: true
                    })
                    .draw(event); //put down start - temp

                this.lastX = this.x;
                this.lastY = this.y;
                this.path_str += ` L${this.x} ${this.y}`;
                this.points_down++;
            }

            //if this point is close to first point of path

            if (this.points_down > 2 && Math.abs(this.firstY - this.y) < 5 && Math.abs(this
                    .firstX -
                    this.x) < 5) {

                this.path_str += " Z";

                let path = document.createElementNS(svgns, 'path');

                this.setAttributes(path, {
                    "d": this.path_str,
                    'fill-opacity': this["fill-opacity"],
                    'stroke': this.stroke,
                    'fill': this.fill,
                    'stroke-width': this["stroke-width"],
                });

                this.insertElement(path, event);

                getNewTool("path");

            }

        }

    }





    /*Text Tool */
    class TextTool extends DrawingTool {
        constructor(options = {}) {
            super(options);
            this.type = "text";
            this.cursor = "text";
            this.color = drawing_settings.color || options.color || "#000";
            this["font-size"] = (options["font-size"] || drawing_settings["font-size"]);

        }

        draw(event) {
            deselectDrawings();

            this.x = event.offsetX;
            this.y = event.offsetY + 140;

            var text = $("<div></div>")
                .css({
                    position: "absolute",
                    minHeight: "25px",
                    minWidth: "70px",
                    display: "block",
                    top: this.y,
                    left: this.x,
                    zIndex: 500,
                    color: this.color,
                    fontSize: this["font-size"],
                    fontFamily: "Arial"

                })
                .addClass("drawn_element text")
                .attr({
                    contenteditable: true
                })
                .click(function (ev) {
                    drawingClicked(text, ev);
                });

            $(text).keyup(function (ev) {
                moveElement(text, ev);
            });

            $("#map1_outer_div").append(text);

            selectElem(text);
        }
    }



    /* Remove Tool */

    class RemoveTool extends DrawingTool {
        constructor(options = {}) {
            super(options);
            this.type = "remove";
            this.cursor = "pointer";
        }
    }


    /* Select Tool */

    class SelectTool extends DrawingTool {
        constructor(options = {}) {
            super(options);
            this.type = "select";
            this.cursor = "default";
        }
    }






    //get new tool function
    function getNewTool(type) {

        $(".temp").remove();

        let tools = {
            line: new LineTool(),
            point: new PointTool(),
            text: new TextTool(),
            path: new PathTool(),
            remove: new RemoveTool(),
            select: new SelectTool()

        }
        current_tool = tools[type];
    }



    //update drawing settings function
    function updateDrawingSettings() {
        $(".drawing_input").each(function (i, e) {
            drawing_settings[$(this).attr("data-drawing-rel")] = $(this).val() + ($(this)
                .attr(
                    "data-suffix") || "");
        });

        drawing_settings.color = $("#tool_fill").val();
    }


    // click a new tool type button
    $(".tool_button.tool_type").click(function () {

        deselectDrawings();

        if ($(this).hasClass("active")) {
            $(this).removeClass("active");
            current_tool.shelve();
        } else {
            $(".active").removeClass("active");
            $(this).addClass("active");

            updateDrawingSettings();
            getNewTool($(this).attr("data-type"));
        }

    });


    // change a drawing input
    $(".drawing_input").on("keyup change", function () {

        updateDrawingSettings();
        updateSelected();
        getNewTool($(".active").attr("data-type"));

    })


    //undo button
    $("#undo_draw_button").click(function (e) {
        let last_elem = $(".drawn_element:last");
        last_elem.remove();
    });





    /* updates selected svg element*/
    function updateSelected() {

        for (key in drawing_settings) {
            $(".drawing-selected").each(function () {

                if ($(this).hasClass("text")) {
                    $(this).css(key, drawing_settings[key]);
                    $(this).attr("data-prev-" + key, drawing_settings[key]);
                } else {
                    $(this).attr(key, drawing_settings[key]);
                    $(this).attr("data-prev-" + key, drawing_settings[key]);
                }
            });
        }
    }


    /*removes selected svg and text elems */
    function deselectDrawings() {
        $(".drawing-selected").removeClass("drawing-selected").blur();
    }


    //adds drawing-selected class and properties to a drawing-selected drawing element
    function selectElem(elem) {
        $(elem).addClass("drawing-selected").focus()
            .keydown(function (event) {
                if (event.key === "Backspace" || event.key === "Delete") {
                    if ($(elem).text() === "") {
                        $(elem).remove();
                        getNewTool($(".active").attr("data-type"));
                    }
                }
            })

    }


    //drawing clicked (binded to drawn elems)
    function drawingClicked(elem, ev) {

        if (current_tool.type === "remove") {
            $(elem).remove();
        }
        if (current_tool.type === "select") {

            if ($(elem).hasClass("drawing-selected")) {
                deselectDrawings();
            } else {
                selectElem(elem);
            }
        } else {
            deselectDrawings();
        }

        if ($("#select_tool_button").hasClass("active")) {
            ev.stopPropagation();
        }

    }

    //move element (with arrows) //
    function moveElement(elem, ev) {

        if ([37, 38, 39, 40].includes(ev.keyCode)) { //arrow keys

            let new_pos = {
                "37": {
                    rel_svg: "x",
                    rel_html: "left",
                    amount: -10
                },
                "38": {
                    rel_svg: "y",
                    rel_html: "top",
                    amount: -10
                },
                "39": {
                    rel_svg: "x",
                    rel_html: "left",
                    amount: 10
                },
                "40": {
                    rel_svg: "y",
                    rel_html: "top",
                    amount: 10
                },
            } [ev.keyCode];


            if (ev.shiftKey) {
                new_pos.amount *= 0.1;
            }


            if ($(elem).prop('nodeName').toLowerCase() === "div") {

                let pos = parseInt($(elem).css(new_pos.rel_html).replace("px", ""));
                pos += new_pos.amount;
                $(elem).css(new_pos.rel_html, pos + "px");

            } else {
                let parent_svg = $(elem).parent("svg.drawn_element");
                parent_svg.attr(new_pos.rel_svg, parseInt(parent_svg.attr(new_pos.rel_svg)) + new_pos
                    .amount);
            }


        }
    }



//mouse over canvas while drawing tool is selected
$("#map1_outer_div").mouseenter(function () {
    $(this).css("cursor", current_tool && current_tool.cursor ? current_tool.cursor :
        "default");
});


});