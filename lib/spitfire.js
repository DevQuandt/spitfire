DrawingObjects = new Mongo.Collection('DrawingObjects');
SessionData = new Mongo.Collection('SessionData');

var PARAM_DELIMITER = ',';

function initHelpers() {
    Handlebars.registerHelper('appTitle', function () {
        return Meteor.spitfire.appTitle();
    });

    Handlebars.registerHelper('sessionName', function () {
        return Meteor.spitfire.getSessionName();
    });

    Handlebars.registerHelper('home', function () {
        return Meteor.spitfire.getHome();
    });

    Handlebars.registerHelper('hasSessionName', function () {
        return Meteor.spitfire.hasSessionName();
    });

    Handlebars.registerHelper('isInitialized', function () {
        return Meteor.spitfire.isInitialized();
    });

    Handlebars.registerHelper('minGrid', function () {
        return Meteor.grid.getMinGrid();
    });
}


function initRouter() {
    Router.configure({
        progressDelay: 100,
        progressSpinner: false,
        loadingTemplate: 'loading'
    });

    Router.route('/', 'editor');
    Router.route('/about', {progress: false});
    Router.route('/sessions', {
        waitOn: function () {
            return Meteor.subscribe('sessionData');
        }
    });
    Router.route('/:sessionName/:any1?/:any2?/:any3?', function () {
            //:any parameters are only to deal with the failure case of additional slashes in session name
            var sessionName = this.params.sessionName;

            if (!Meteor.grid.hasGrid()) {
                var grid = Meteor.grid.parseGrid(sessionName);
                Meteor.grid.setGrid(grid);
            }

            var auth = Meteor.auth.parseAuth(sessionName);
            Meteor.auth.setAuth(auth);

            var paramIdx = sessionName.indexOf(PARAM_DELIMITER);
            if (paramIdx >= 0) {
                sessionName = sessionName.substring(0, paramIdx);
            }

            Meteor.spitfire.setSessionName(sessionName);

            Router.go('/' + Meteor.spitfire.getHome());
            this.render('editor');

        }, {
            waitOn: function () {
                return Meteor.subscribe('drawingObjects', Meteor.spitfire.getSessionName())
            },
        }
    );
}


Meteor.spitfire = {
    hasSessionName: function () {
        return Meteor.spitfire.getSessionName() ? true : false;
    },
    getSessionName: function () {
        return Session.get('sessionName');
    },
    setSessionName: function (sessionName) {
        Session.set('sessionName', sessionName); //reactivity needed
        document.title = Meteor.spitfire.documentTitle();
    },
    escapeRegEx: function (s) {
        return s.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
    },
    appTitle: function () {
        return 'Spitfire'
    },
    getHome: function () {
        return Meteor.spitfire.getSessionName() + Meteor.grid.getGridString() + Meteor.auth.getAuthString();
    },
    setInitialized: function () {
        Session.set('initialized', true); //reactivity needed
    },
    isInitialized: function () {
        return Session.get('initialized');
    },
    documentTitle: function () {
        if (Meteor.spitfire.hasSessionName()) {
            return Meteor.spitfire.getSessionName();
        } else {
            return Meteor.spitfire.appTitle();
        }
    },
    isEditing: function (drawingObject) {
        //initEditing - when a user creates items where an editId is not immediatly available
        //this will avoid the flicker of first displaying an empty non-editing item and
        //changing this item to an editable item. instead will directly show the editable item.
        return (Meteor.text.initId() && Meteor.text.initId() === drawingObject.initId) ||
            (Meteor.text.editId() && Meteor.text.editId() === drawingObject._id);
    },
    uid: function () {
        return ('0000' + (Math.random() * Math.pow(36, 4) << 0).toString(34)).slice(-4);
    },
    prepareSize: function (source, destination) {
        if (source.width && source.height) {
            destination.width = source.width;
            destination.height = source.height;
        }
        return destination;
    },
    preparePosition: function (source, destination) {
        if (source.left && source.top) {
            destination.top = source.top;
            destination.left = source.left;
        }
        return destination;
    },
    prepareZIndex: function (source, destination) {
        if (source.zIndex) {
            destination.zIndex = source.zIndex;
        }
        return destination;
    },
    prepareEditing: function (source, destination) {
        if (source.editing || source.editing == null) {
            destination.editing = source.editing;
        }
        if (source.initId || source.initId == null) {
            destination.initId = source.initId;
        }
        return destination;
    },
    prepareDragging: function (source, destination) {
        if (source.dragging || source.dragging == null) {
            destination.dragging = source.dragging;
        }
        return destination;
    },
    prepareSizing: function (source, destination) {
        if (source.sizing || source.sizing == null) {
            destination.sizing = source.sizing;
        }
        return destination;
    },


    initServer: function () {
        Meteor.publish('drawingObjects', function (sessionName) {
            return DrawingObjects.find({sessionName: sessionName});
        });

        Meteor.publish('sessionData', function (sessionName) {

                if (this.userId) {
                    var user = Meteor.users.findOne({
                        _id: this.userId,
                    });

                    if (user && user.username && user.username.toLowerCase() === 'admin') {
                        return SessionData.find({'sessionName': {$ne: null}}, {
                            sort: {modifiedAt: -1, sessionName:1}
                        });
                    }
                }

                return [];
            }
        );

        Meteor.methods({
            maintainSessionData: function (data) {
                var session = SessionData.findOne({sessionName: data.sessionName});
                if (session) {
                    return SessionData.update({_id: session._id}, {
                        $set: {sessionName: data.sessionName, modifiedAt: new Date()}
                    });
                } else {
                    return SessionData.insert({sessionName: data.sessionName, modifiedAt: new Date()});
                }
            }
        });


    },

    initClient: function () {
        document.title = Meteor.spitfire.documentTitle();

        initHelpers();
        initRouter();

        Meteor.startup(function () {
            $(document).on('keydown', function (event) {
                if (Meteor.select.isSelected() && (event.ctrlKey || event.metaKey)) {

                    if (event.which && event.which === 37 || event.keyCode && event.keyCode === 37) {
                        //cursor left
                        event.preventDefault();
                        event.stopPropagation();
                        Meteor.drawingObject.alignLeft();
                    } else if (event.which && event.which === 39 || event.keyCode && event.keyCode === 39) {
                        //cursor right
                        event.preventDefault();
                        event.stopPropagation();
                        Meteor.drawingObject.alignRight();
                    } else if (event.which && event.which === 38 || event.keyCode && event.keyCode === 38) {
                        //cursor top
                        event.preventDefault();
                        event.stopPropagation();
                        Meteor.drawingObject.alignTop();
                    } else if (event.which && event.which === 40 || event.keyCode && event.keyCode === 40) {
                        //cursor bottom
                        event.preventDefault();
                        event.stopPropagation();
                        Meteor.drawingObject.alignBottom();
                    }

                }
            });
        });

        Meteor.spitfire.setInitialized();
    }

}
;

(function () {
    Meteor.methods({
            initEditing: function (data) {
                var now = new Date();
                var insert = {
                    initId: data.initId,
                    sessionName: data.sessionName,
                    editing: now,
                    modifiedAt: now,
                    createdAt: now
                };
                Meteor.spitfire.preparePosition(data, insert);
                Meteor.spitfire.prepareSize(data, insert);
                Meteor.spitfire.prepareZIndex(data, insert);
                return DrawingObjects.insert(insert);
            },
            updateEditing: function (data) {
                var now = new Date();
                var update = {
                    initId: null,
                    text: data.text,
                    editing: now,
                    modifiedAt: now
                };
                Meteor.spitfire.prepareSize(data, update);
                Meteor.spitfire.prepareZIndex(data, update);
                return DrawingObjects.update(data.id, {
                        $set: update
                    }
                );
            },
            update: function (data) {
                var update = {
                    initId: null,
                    text: data.text,
                    editing: null,
                    modifiedAt: new Date()
                };
                Meteor.spitfire.prepareSize(data, update);
                Meteor.spitfire.prepareZIndex(data, update);
                Meteor.call('maintainSessionData',data);
                return DrawingObjects.update(data.id, {
                    $set: update
                });

            },
            removeEditing: function (id) {
                var data = DrawingObjects.findOne({_id: id});

                if (data && !data.text) {
                    return DrawingObjects.remove(id);
                } else {
                    return DrawingObjects.update(id, {
                            $set: {
                                initId: null,
                                editing: null
                            }
                        }
                    );
                }
            },
            cleanUp: function (data) {
                var cleanup = {
                    modifiedAt: new Date()
                };
                Meteor.spitfire.prepareEditing(data, cleanup);
                Meteor.spitfire.prepareDragging(data, cleanup);
                Meteor.spitfire.prepareSizing(data, cleanup);
                return DrawingObjects.update(data.id, {
                    $set: cleanup
                });
            },
            remove: function (id) {
                DrawingObjects.remove(id);
            },
            updatePosition: function (data) {
                var update = {
                    initId: null,
                    dragging: data.dragging,
                    modifiedAt: new Date()
                };
                Meteor.spitfire.preparePosition(data, update);
                Meteor.spitfire.prepareZIndex(data, update);
                return DrawingObjects.update(
                    data.id, {
                        $set: update
                    }
                );
            },
            resize: function (data) {
                var update = {
                    initId: null,
                    sizing: data.sizing,
                    modifiedAt: new Date()
                };
                Meteor.spitfire.prepareSize(data, update);
                Meteor.spitfire.prepareZIndex(data, update);
                return DrawingObjects.update(data.id, {
                        $set: update
                    }
                );

            },
            vote: function (id) {
                return DrawingObjects.update(
                    id, {
                        $inc: {
                            vote: 1
                        }
                    }
                );
            },
            downVote: function (id) {
                var data = DrawingObjects.findOne({_id: id}, {fields: {vote: 1}});
                if (data && data.vote > 0) {
                    return DrawingObjects.update(
                        id, {
                            $inc: {
                                vote: -1
                            }

                        }
                    );
                }
            }
        }
    );
})();
