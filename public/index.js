(function() {

  $(function() {
    var $clientCounter, app, socket, view;
    app = window.app = new Whiteboard.AppModel();
    view = window.view = {};
    $clientCounter = $("#client_count");
    socket = io.connect('http://localhost');
    socket.on('connect', function() {
      socket.emit('message', {
        event: 'session'
      });
      return console.log('connected');
    });
    return socket.on('message', function(data) {
      var changedModel;
      console.log('RECD:', data);
      switch (data.event) {
        case 'initial':
          app["import"](data.app);
          view = window.view = new AppView({
            el: $('body'),
            model: app
          });
          view.render();
          return $clientCounter.html('1');
        case 'change':
          if (changedModel) {
            return changedModel.set(data.data);
          } else {
            return console.error('model not found for change event', data);
          }
          break;
        case 'add':
          return Whiteboard.models[data.collection].add(data.data.attrs);
        case 'remove':
          changedModel = Whiteboard.models[data.id];
          if (changedModel && changedModel.collection) {
            return changedModel.collection.remove(changedModel);
          }
      }
    });
  });

}).call(this);
