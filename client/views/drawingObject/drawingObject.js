var dragTime;
var DRAG_UPDATE_DELAY = 100; //milliseconds interval for writing to db


Meteor.drawingObject = {

    checkDragDelay: function () {
        var now = new Date().getTime();
        return now - dragTime > DRAG_UPDATE_DELAY;
    },
    enableDrag: function (id) {
        if (id) {
            $('#draggable' + id).draggable({
                scroll: true, helper: 'original', containment: '#canvas', stack: '.draggable'
            });
        } else {
            $('.draggable').draggable({
                scroll: true, helper: 'original', containment: '#canvas', stack: '.draggable'
            });
        }
    },
    enableResize: function (id) {
        if (id) {
            $('#sizeable' + id).resizable({
                minHeight: 22, minWidth: 22, autoHide: true
            });
        } else {
            $('.sizeable').resizable({
                minHeight: 22, minWidth: 22, autoHide: true
            });
        }
    },
    resize: function (id, zIndex) {
        if (id) {
            var sizeable = $('#sizeable' + id);
            if (sizeable) {
                var width = sizeable.width();
                var height = sizeable.height();
                Meteor.call('resize', {
                    id: id,
                    width: width,
                    height: height,
                    zIndex: zIndex
                });

            }
        }
    },

    updatePosition: function (id, event, zIndex) {
        var position = $(event.currentTarget).position();
        if (position) {

            Meteor.call('updatePosition', {
                id: id,
                left: position.left,
                top: position.top,
                zIndex: zIndex
            });

            dragTime = new Date().getTime();
        }

    },
    remove: function (id) {
        if (id) {
            Meteor.call('remove', id);
        }
    },

    init: function () {
        Template.drawingObject.events({
            'dblclick .text': function (event) {
                //same as click .edit
                event.preventDefault();
                event.stopPropagation();
                if (!event.shiftKey) {
                    Meteor.text.editText(this);
                }
            },
            'click': function (event) {
                //click is not supported here, except on links
                event.preventDefault();
                event.stopPropagation();
            },
            'dragstart': function (event) {
                Meteor.drawingObject.updatePosition(this._id, event, Meteor.canvas.maxZIndex() + 1);
            },
            'drag': function (event) {
                var e = $('#editor');
                if (event.pageX + 200 > e.width()) {
                    e.width(e.width() + 100);
                }
                if (event.pageY + 200 > e.height()) {
                    e.height(e.height() + 100);
                }

                if (Meteor.drawingObject.checkDragDelay()) {
                    Meteor.drawingObject.updatePosition(this._id, event); //intentionally not changing z-index
                }
            },
            'dragstop': function (event) {
                Meteor.drawingObject.updatePosition(this._id, event, Meteor.canvas.maxZIndex() + 1);
            },
            'resizestart': function () {
                Meteor.canvas.setOverlay(true, this._id);
            },
            'resizestop': function () {
                Meteor.canvas.setOverlay(false, this._id);
                Meteor.drawingObject.resize(this._id, Meteor.canvas.maxZIndex() + 1);
            },


            //must be last one, to not produce error: 'must be attached ...'
            'click .delete': function (event) {
                event.preventDefault();
                event.stopPropagation();
                Meteor.drawingObject.remove(this._id);
            }
        });

        Template.drawingObject.rendered = function () {
            Meteor.drawingObject.enableDrag(Template.currentData()._id);
        };


        Template.drawingObject.helpers({
            isEdit: function () {
                return Meteor.spitfire.isEdit(this);
            },
            edit: function () {
                return this.edit ? "edit" : "";
            }
        });

    }

}
;