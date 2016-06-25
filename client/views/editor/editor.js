Meteor.editor = {

    _isTopMarker: function () {
        return $(window)
                .scrollTop() > 0;
    },
    _isLeftMarker: function () {
        return $(window)
                .scrollLeft() > 0;
    },
    _isRightMarker: function () {
        var w = $(window);
        var e = $("#editor");
        var ww = w.width();
        var ew = e.width();
        var sl = $(w)
            .scrollLeft();

        return sl + ww < ew;
    },
    _isBottomMarker: function () {
        var w = $(window);
        var e = $("#editor");
        var wh = w.height();
        var eh = e.height();
        var st = $(w)
            .scrollTop();

        return st + wh < eh;
    },
    maintainBoundaryMarker: function () {
        $("#topMarker")
            .css("display", Meteor.editor._isTopMarker() ? "block" : "none");
        $("#leftMarker")
            .css("display", Meteor.editor._isLeftMarker() ? "block" : "none");
        $("#rightMarker")
            .css("display", Meteor.editor._isRightMarker() ? "block" : "none");
        $("#bottomMarker")
            .css("display", Meteor.editor._isBottomMarker() ? "block" : "none");

        var e = $("#editor");
        var w = $(window);

        e.width(Math.max(w.width(), Math.max(e.width(), Meteor.canvas.getDrawingWidth() + 200)));
        e.height(Math.max(w.height(), Math.max(e.height(), Meteor.canvas.getDrawingHeight() + 200)));

    },
    getWidth: function () {
        return $("#editor")
            .width();
    },
    getHeight: function () {
        return $("#editor")
            .height();
    }
};

Template.editor.helpers({
    isAuth: function () {
        return Meteor.auth.isAuth();
    }
});


Template.editor.rendered = function () {
    document.title = Meteor.spitfire.documentTitle();
    Meteor.editor.maintainBoundaryMarker();
    Meteor.grid.maintainGrid();
    if (Meteor.spitfire.getHome() !== Router.current()
            .location
            .get().pathname) {
        Router.go(Meteor.spitfire.getHome());
    }
}

Template.editor.events({
    "dropped #canvas": function (event) {
        event.preventDefault();
        event.stopPropagation();
        Meteor.import.processFiles(Meteor.import.extractFiles(event));
    },
    "dragover #canvas": function (event) {
        event.preventDefault();
        event.stopPropagation();
        Meteor.import.handleFileDrag(event);
    }
});

(function () {
    $(window)
        .on("scroll", function () {
            Meteor.editor.maintainBoundaryMarker();
        });
    $(window)
        .on("resize", function () {
            Meteor.editor.maintainBoundaryMarker();
        });
})();