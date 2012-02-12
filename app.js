(function() {
  var app, backbone, express, io, whiteboard, _;

  require('jade');

  _ = require('underscore')._;

  backbone = require('backbone');

  express = require('express');

  whiteboard = require('./whiteboard.js');

  app = express.createServer();

  app.set('view engine', 'jade');

  app.set('view options', {
    layout: false
  });

  app.configure('development', function() {
    return app.use(express.static(__dirname));
  });

  io = require('socket.io').listen(app);

  app.listen(3000);

  app.get('/', function(req, res) {
    return res.render('index');
  });

  app.get('/*(js|css)', function(req, res) {
    return res.sendfile('./public' + req.url);
  });

  io.sockets.on('connection', function(client) {
    var sendClientChanges;
    sendClientChanges = function(changes) {
      return client.send(changes);
    };
    client.on('disconnect', function() {
      if (appModel) return appModel.unbind('publish', sendClientChanges);
    });
    return client.on('message', function(message) {
      var appModel, collection, model;
      console.log(message.event);
      switch (message.event) {
        case 'session':
          if (!appModel) appModel = new whiteboard.AppModel();
          client.send({
            event: 'initial',
            app: appModel["export"]()
          });
          return appModel.bind('publish', sendClientChanges);
        case 'set':
          return appModel.modelGetter(message.id).set(message.change);
        case 'delete':
          model = appModel.modelGetter(message.id);
          if (model && model.collection) return model.collection.remove(model);
          break;
        case 'add':
          collection = appModel.modelGetter(message.id);
          if (collection) return collection.addModel(message.data);
      }
    });
  });

}).call(this);
