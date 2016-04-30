var dragTime;
var sizeId;
var DRAG_OR_SIZE_TIME_OUT = 1000 * 30; //milliseconds interval
var before;


Meteor.drawingObject = {
    isDragTimeout: function (drawingObject) {
        if (drawingObject && drawingObject.dragging) {
            var now = new Date();
            return now.getTime() - drawingObject.dragging.getTime() > DRAG_OR_SIZE_TIME_OUT;
        }
        else {
            return false;
        }
    }
    ,
    isSizeTimeout: function (drawingObject) {
        if (drawingObject && drawingObject.sizing) {
            var now = new Date();
            return now.getTime() - drawingObject.sizing.getTime() > DRAG_OR_SIZE_TIME_OUT;
        } else {
            return false;
        }
    }
    ,
    getSizeId: function () {
        return sizeId;
    }
    ,
    clearSizing: function () {
        sizeId = null;
    }
    ,
    enableDrag: function (id) {
        if (id) {
            $("#draggable" + id)
                .draggable({
                    scroll: true, helper: "original", containment: "#canvas", stack: ".draggable"
                });
        } else {
            $(".draggable")
                .draggable({
                    scroll: true, helper: "original", containment: "#canvas", stack: ".draggable"
                });
        }
    }
    ,
    enableResize: function (id) {
        if (id) {
            $("#sizeable" + id)
                .resizable({
                    minHeight: 22, minWidth: 22, autoHide: true, handles: "e, se"
                });
        } else {
            $(".sizeable")
                .resizable({
                    minHeight: 22, minWidth: 22, autoHide: true, handles: "e, se"
                });
        }
    }
    ,
    resize: function (drawingObject, zIndex, persist, stop) {
        if (drawingObject) {
            var sizeable = $("#sizeable" + drawingObject._id);
            if (sizeable) {
                var width = sizeable.width();
                var height = sizeable.height();
                drawingObject.width = width;
                drawingObject.height = height;
                Meteor.drawingObject.drawConnect(drawingObject);
                drawingObject.zIndex = zIndex;
                drawingObject.sizing = stop ? null : new Date();

                if (stop) {
                    var after = Meteor.util.clone(drawingObject);
                    Meteor.command.resize(before, after);
                } else if (persist) {
                    Meteor.call("resize", drawingObject);
                }

            }
        }
    }
    ,
    _snapToGrid: function (drawingObject) {
        var draggable = $("#draggable" + drawingObject._id);
        if (draggable) {
            var position = draggable.position();
            if (position) {
                var l = Meteor.grid.snapLeft(position.left);
                var t = Meteor.grid.snapTop(position.top);
                draggable.css({left: l, top: t});
            }
        }
    }
    ,
    updatePosition: function (drawingObject, persist, zIndex, stop) {

        if (persist || stop) {
            Meteor.drawingObject._snapToGrid(drawingObject);
        }

        var position = $("#draggable" + drawingObject._id).position();
        if (position) {


            if (Meteor.select.isSelected()) {
                //update the entire selection

                var xOffset = position.left - drawingObject.left;
                var yOffset = position.top - drawingObject.top;

                var selectedObjects = Meteor.select.getSelectedObjects();
                for (var i = 0; i < selectedObjects.length; i++) {
                    $("#draggable" + selectedObjects[i]._id)
                        .css({
                            left: selectedObjects[i].left + xOffset,
                            top: selectedObjects[i].top + yOffset
                        });

                    selectedObjects[i].left = selectedObjects[i].left + xOffset;
                    selectedObjects[i].top = selectedObjects[i].top + yOffset;
                    Meteor.drawingObject.drawConnect(selectedObjects[i]);
                    selectedObjects[i].zIndex = zIndex;
                    selectedObjects[i].dragging = stop ? null : new Date();

                }

                if (stop) {
                    Meteor.command.position(before, selectedObjects);
                } else if (persist) {
                    Meteor.call("updatePosition", selectedObjects);
                }


            } else {
                //update only one
                drawingObject.left = position.left;
                drawingObject.top = position.top;
                Meteor.drawingObject.drawConnect(drawingObject);
                if (persist || stop) {
                    drawingObject.zIndex = zIndex;
                    drawingObject.dragging = stop ? null : new Date();
                    if (stop) {
                        var after = Meteor.util.clone(drawingObject);
                        Meteor.command.position(before, after);
                    } else {
                        Meteor.call("updatePosition", drawingObject);
                    }
                }
            }

            dragTime = new Date().getTime();
        }
    }
    ,
    _adaptPosition: function (drawingObject, left, top, zIndex) {
        drawingObject.left = left;
        drawingObject.top = top;
        drawingObject.zIndex = zIndex;
    }
    ,
    clearFatherId: function () {
        Session.set("fatherId", null);
    },
    getFatherId: function () {
        return Session.get("fatherId");
    },
    setFatherId: function (connect) {
        Session.set("fatherId", connect);
    },
    removeConnect: function (son) {
        var connect = $("#connect" + son._id);
        if (connect.length !== 0) {
            connect.remove();
        }
    },
    drawConnect: function (drawingObject) {
        //detect connections
        var connections=[];
        var drawingObjects = Meteor.canvas.getDrawingObjects();
        drawingObjects.forEach(function(object) {
            if (object.father == drawingObject._id) {
                connections.push(object);
            } else if (object._id == drawingObject._id && object.father) {
                connections.push(object);
            }
        });

        for(i = 0; i < connections.length; i++) {
            Meteor.drawingObject.removeConnect(connections[i]);
            if (connections[i].father) {
                var father = $("#draggable" + connections[i].father);
                if (father.length == 0) {
                    father = $("#textinput" + connections[i].father);
                }
                var son = $("#draggable" + connections[i]._id);
                if (son.length == 0) {
                    son = $("#textinput" + connections[i]._id);
                }
                if (father.length !== 0 && son.length !== 0) {
                    var svg = $("#canvasdrawing");
                    if (svg) {
                        var line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                        line.setAttribute("id", 'connect' + connections[i]._id);
                        if (father.position().left + father.outerWidth() < son.position().left) {
                            line.setAttribute("x1", father.position().left + father.outerWidth());
                        } else {
                            line.setAttribute("x1", father.position().left);
                        }
                        if (father.position().top + father.outerHeight() < son.position().top) {
                            line.setAttribute("y1", father.position().top + father.outerHeight());
                        } else {
                            line.setAttribute("y1", father.position().top);
                        }
                        if (son.position().left + son.outerWidth() < father.position().left) {
                            line.setAttribute("x2", son.position().left + son.outerWidth());
                        } else {
                            line.setAttribute("x2", son.position().left);
                        }
                        if (son.position().top + son.outerHeight()  < father.position().top) {
                          line.setAttribute("y2", son.position().top + son.outerHeight())
                        } else {
                            line.setAttribute("y2", son.position().top);
                        }
                        line.setAttribute("stroke", "#111");
                        line.setAttribute("style", "marker-end: url(#markerArrow)");
                        svg.append(line);
                    }
                }
            }
        }
    },
    connect: function (son) {
        var fatherId = Meteor.drawingObject.getFatherId();
        if (fatherId) {
            Meteor.drawingObject.removeConnect(son);
            son.father = fatherId;
            Meteor.call("connect", son);
            Meteor.drawingObject.drawConnect(son);
        }

        Meteor.drawingObject.setFatherId(son._id);
    }
    ,
    remove: function (drawingObject) {
        if (drawingObject) {
            Meteor.command.remove(drawingObject);
        } else {
            var selectedObjects = Meteor.select.getSelectedObjects();
            var before = Meteor.util.clone(selectedObjects);
            if (selectedObjects) {
                Meteor.command.remove(before);
            }
        }
    }
    ,
    vote: function (drawingObject) {
        Meteor.command.vote(drawingObject);
    }
    ,
    downVote: function (drawingObject) {
        Meteor.command.downVote(drawingObject);
    }
    ,
    alignLeft: function () {
        var selectedObjects = Meteor.select.getSelectedObjects();
        var before = Meteor.util.clone(selectedObjects);
        var minX = Meteor.canvas.getDrawingWidth();
        var i;

        for (i = 0; i < selectedObjects.length; i++) {
            minX = Math.min(selectedObjects[i].left, minX);
        }
        for (i = 0; i < selectedObjects.length; i++) {
            Meteor.drawingObject._adaptPosition(selectedObjects[i], minX, selectedObjects[i].top);
        }

        Meteor.command.position(before, selectedObjects);
    }
    ,
    alignRight: function () {
        var selectedObjects = Meteor.select.getSelectedObjects();
        var before = Meteor.util.clone(selectedObjects);
        var maxX = 0;
        var i;

        for (i = 0; i < selectedObjects.length; i++) {
            maxX = Math.max(selectedObjects[i].left + selectedObjects[i].width, maxX);
        }
        for (i = 0; i < selectedObjects.length; i++) {
            Meteor.drawingObject._adaptPosition(selectedObjects[i], maxX - selectedObjects[i].width, selectedObjects[i].top);
        }

        Meteor.command.position(before, selectedObjects);

    }
    ,
    alignTop: function () {
        var selectedObjects = Meteor.select.getSelectedObjects();
        var before = Meteor.util.clone(selectedObjects);
        var minY = Meteor.canvas.getDrawingHeight();
        var i;

        for (i = 0; i < selectedObjects.length; i++) {
            minY = Math.min(selectedObjects[i].top, minY);
        }
        for (i = 0; i < selectedObjects.length; i++) {
            Meteor.drawingObject._adaptPosition(selectedObjects[i], selectedObjects[i].left, minY);
        }

        Meteor.command.position(before, selectedObjects);

    }
    ,
    alignBottom: function () {
        var selectedObjects = Meteor.select.getSelectedObjects();
        var before = Meteor.util.clone(selectedObjects);
        var maxY = 0;
        var i, uiObject;

        for (i = 0; i < selectedObjects.length; i++) {
            uiObject = $("#draggable" + selectedObjects[i]._id);
            maxY = Math.max(selectedObjects[i].top + uiObject.height(), maxY);
        }
        for (i = 0; i < selectedObjects.length; i++) {
            uiObject = $("#draggable" + selectedObjects[i]._id);
            Meteor.drawingObject._adaptPosition(selectedObjects[i], selectedObjects[i].left, maxY - uiObject.height());
        }

        Meteor.command.position(before, selectedObjects);

    }
    ,
    moveLeft: function () {
        Meteor.drawingObject.move(-2, 0);
    }
    ,
    moveUp: function () {
        Meteor.drawingObject.move(0, -2);
    }
    ,
    moveRight: function () {
        Meteor.drawingObject.move(2, 0);
    }
    ,
    moveDown: function () {
        Meteor.drawingObject.move(0, 2);
    },
    move: function (left, top) {
        var selectedObjects = Meteor.select.getSelectedObjects();
        var before = Meteor.util.clone(selectedObjects);
        var stop = false;
        var i;

        if (left < 0 || top < 0) {
            for (i = 0; i < selectedObjects.length; i++) {
                if (left < 0 && selectedObjects[i].left + left <= 0) {
                    stop = true;
                } else if (top < 0 && selectedObjects[i].top + top <= 0) {
                    stop = true;
                }
            }
        }
        if (!stop) {
            for (i = 0; i < selectedObjects.length; i++) {
                Meteor.drawingObject._adaptPosition(selectedObjects[i], selectedObjects[i].left + left, selectedObjects[i].top + top);
            }

            Meteor.command.position(before, selectedObjects);
        }
    }

};

(function () {

    Template.drawingObject.events({
            "click .text a": function (event) {
                if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) {
                    event.preventDefault();
                    if (event.altKey) {
                        Meteor.drawingObject.connect(this);
                    } else if (event.ctrlKey || event.metaKey) {
                        if (Meteor.select.isSelected(this._id)) {
                            Meteor.command.unSelect(this);
                        } else {
                            Meteor.command.select(this);
                        }
                    }
                }
                event.stopPropagation();
            },
            "click .text, dblclick .text": function (event) {
                event.preventDefault();
                event.stopPropagation();
                if (!event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
                    Meteor.text.editText(this);
                } else if (event.altKey) {
                    Meteor.drawingObject.connect(this);
                }
            },
            "dragstart": function (event) {

                if (!event.ctrlKey && !event.metaKey) {
                    if (!Meteor.select.isSelected(this._id)) {
                        Meteor.command.unSelect();
                    }
                    if (Meteor.select.isSelected()) {
                        before = Meteor.select.getSelectedObjects();
                    } else {
                        before = Meteor.util.clone(this);
                    }
                    Meteor.drawingObject.updatePosition(this, true, Meteor.canvas.getMaxZIndex() + 1);
                }
            },
            "drag": function (event) {
                if (!event.ctrlKey && !event.metaKey) {
                    var editor = $("#editor");
                    if (event.pageX + this.width > editor.width()) {
                        editor.width(editor.width() + 100);
                    }
                    if (event.pageY + this.height > editor.height()) {
                        editor.height(editor.height() + 100);
                    }
                    Meteor.drawingObject.updatePosition(this, false); //intentionally not changing z-index and not persisting
                }
            },
            "dragstop": function (event) {
                if (!event.ctrlKey && !event.metaKey) {
                    Meteor.drawingObject._snapToGrid(this);
                    Meteor.drawingObject.updatePosition(this, true, Meteor.canvas.getMaxZIndex() + 1, true);
                }
            },
            "resizestart": function () {
                sizeId = this._id;
                Meteor.command.unSelect();
                before = Meteor.util.clone(this);
                Meteor.drawingObject.resize(this, Meteor.canvas.getMaxZIndex() + 1, true);
            },
            "resize": function () {
                Meteor.drawingObject.resize(this, Meteor.canvas.getMaxZIndex());
            },
            "resizestop": function () {
                sizeId = null;
                Meteor.drawingObject.resize(this, Meteor.canvas.getMaxZIndex() + 1, true, true);
            },

            "click .vote, dblclick .vote": function (event) {
                event.preventDefault();
                event.stopPropagation();

                Meteor.drawingObject.vote(this);
            },
            "click .down-vote, dblclick .down-vote": function (event) {
                event.preventDefault();
                event.stopPropagation();

                Meteor.drawingObject.downVote(this);
            },
            "click .sizeable": function (event) {
                if (event.metaKey || event.ctrlKey) {
                    if (Meteor.select.isSelected(this._id)) {
                        Meteor.command.unSelect(this);
                    } else {
                        Meteor.command.select(this);
                    }
                }
            },


            //must be last one, to not produce error: "must be attached ..."
            "click .delete, dblclick .delete": function (event) {
                event.preventDefault();
                event.stopPropagation();

                Meteor.drawingObject.remove(this);
            }
        }
    );

    Template.drawingObject.rendered = function () {
        Meteor.drawingObject.enableDrag(Template.currentData()._id);
        Meteor.drawingObject.drawConnect(Template.currentData());
    };


    Template.drawingObject.helpers({
        isEditing: function () {
            return Meteor.spitfire.isEditing(this);
        },
        isVote: function () {
            return this.vote > 0;
        },
        editing: function () {
            return this.editing ? "editing" : "";
        },
        dragging: function () {
            return this.dragging ? "dragging" : "";
        },
        sizing: function () {
            return this.sizing ? "sizing" : "";
        },
        selected: function () {
            return Meteor.select.isSelected(this._id) ? "selected" : "";
        },
        isConnect: function () {
            return Meteor.drawingObject.getFatherId() == this._id;

        },
        connect: function () {
            Meteor.drawingObject.drawConnect((this));
            return Meteor.drawingObject.getFatherId() == this._id ? "connect" : "";
        }
    });

})();