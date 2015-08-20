editText = null;
editId = null;
initId = null;
INPUT_TIME_OUT = 1000 * 60 * 2; //2 minutes

Meteor.text = {
    clearText: function () {
        var id = Meteor.canvas.overlayAssignedId();
        if (id && id.indexOf('textinput') ^== 0) {
            Meteor.canvas.setOverlay(false, id);
        }

        editText = null;
        editId = null;
    },
    editId: function () {
        return editId;
    },
    initId: function () {
        return initId;
    },
    isInputTimeOut: function (drawingObject) {
        if (drawingObject && drawingObject.edit) {
            var now = new Date();
            return now.getTime() - drawingObject.edit.getTime() > INPUT_TIME_OUT;
        } else {
            return false;
        }
    },
    editText: function (drawingObject) {
        if (!editId) {
            editText = drawingObject.text;
            editId = drawingObject._id;

            Meteor.call('updateEditing', {
                id: drawingObject._id,
                text: editText
            });
        }

    },
    submitText: function (event) {
        if (event && editId) {
            var text = event.target.value;
            var textControl = $('#textinput' + editId);

            if (textControl) {
                if (!text) {
                    Meteor.drawingObject.remove(editId);
                    Meteor.text.clearText();
                } else {
                    Meteor.call('update', {
                        id: editId,
                        text: text,
                        width: textControl.width(),
                        height: textControl.height()
                    });
                    Meteor.text.clearText();
                }
            }
        }
    },
    initEditing: function (event) {
        //initEditing - when a user creates items where an editId is not immediatly available
        if (event && !editId) {
            initId = Meteor.spitfire.uid();

            Meteor.call('initEditing', {
                sessionName: Meteor.spitfire.sessionName(),
                initId: initId,
                left: event.pageX.valueOf(),
                top: event.pageY.valueOf(),
                width: 200,
                height: 20,
            }, function (error, result) {
                editId = result;
            });
        }
    },

    updateEditing: function (event) {
        if (event && editId) {
            var text = null;
            var textControl = $('#textinput' + editId);
            text = event.target.value;


            if (text != null && textControl) {
                var textControl = $(event.target);
                var width = textControl.width();
                var height = textControl.height();

                if (text != null) {
                    Meteor.call('updateEditing', {
                        id: editId,
                        text: text,
                        width: width,
                        height: height
                    });
                }
            }
        }
    },
    removeEditing: function (id) {
        Meteor.call('removeEditing', id);
    },


    init: function () {
        Template.textForm.helpers({
                isEdit: function () {
                    return Meteor.spitfire.isEdit(this);
                }
            }
        );

        Template.textInput.events({
                'focusout': function (event) {
                    event.preventDefault();
                    event.stopPropagation();
                    Meteor.text.submitText(event);
                },
                'keypress': function (event) {
                    if (event.which && event.which === 13 || event.keyCode && event.keyCode === 13) {
                        if (!event.altKey && !event.ctrlKey && !event.shiftKey) {
                            event.preventDefault();
                            event.stopPropagation();
                            Meteor.text.submitText(event);
                        }
                    }
                },
                'keyup': function (event) {
                    if (event.which && event.which === 27 || event.keyCode && event.keyCode === 27) {
                        event.preventDefault();
                        event.stopPropagation();
                        Meteor.text.submitText(event);
                    } else {
                        var text = event.target.value;
                        if (editText != text) {
                            editText = text;
                            Meteor.text.updateEditing(event);
                        }
                    }

                },
                'mouseup': function (event) {
                    Meteor.text.updateEditing(event);
                },
                'dblclick': function () {
                    event.stopPropagation();
                }
            }
        );


        Template.textInput.rendered = function () {
            Meteor.canvas.setOverlay(true, 'textinput' + Template.currentData()._id);
            var textControl = $('#textinput' + Template.currentData()._id);
            textControl.val(editText);
            textControl.autosize();
            textControl.focus();
        }

        Template.text.helpers({
            hasSize: function () {
                return this.width && this.width > 0 && this.height && this.height > 0;
            }
        });

        Template.text.rendered = function () {
            Meteor.drawingObject.enableDrag(Template.currentData()._id);
            Meteor.drawingObject.enableResize(Template.currentData()._id);
        }
    }
}
