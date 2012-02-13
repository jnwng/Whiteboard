(function() {
  var __hasProp = Object.prototype.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

  $(function() {
    var $clientCounter, Shape, ShapeView, app, shape, shapeView, socket, view;
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
    socket.on('message', function(data) {
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
    Shape = (function(_super) {

      __extends(Shape, _super);

      function Shape() {
        Shape.__super__.constructor.apply(this, arguments);
      }

      Shape.prototype.defaults = {
        x: 50,
        y: 50,
        width: 150,
        height: 150,
        color: 'black'
      };

      Shape.prototype.setTopLeft = function(x, y) {
        return this.set({
          x: x,
          y: y
        });
      };

      Shape.prototype.setDim = function(w, h) {
        return this.set({
          width: w,
          height: h
        });
      };

      return Shape;

    })(Backbone.Model);
    ShapeView = (function(_super) {

      __extends(ShapeView, _super);

      function ShapeView() {
        ShapeView.__super__.constructor.apply(this, arguments);
      }

      ShapeView.prototype.initialize = function() {
        return this.model.bind('change', this.updateView, this);
      };

      ShapeView.prototype.render = function() {
        $("#content").append(this.el);
        $(this.el).html('<div class="shape"/>' + '<div class="control delete hide" />' + '<div class="control change-color hide"/>' + '<div class="control resize hide"/>').css({
          position: 'absolute',
          padding: '10px'
        });
        this.updateView();
        return this;
      };

      ShapeView.prototype.updateView = function() {
        $(this.el).css({
          left: this.model.get('x'),
          top: this.model.get('y'),
          width: (this.model.get('width')) - 10,
          height: (this.model.get('height')) - 10
        });
        return this.$('.shape').css({
          background: this.model.get('color')
        });
      };

      ShapeView.prototype.events = {
        'mousemove': 'mousemove',
        'mouseup': 'mouseup',
        'mouseenter .shape': 'hoveringStart',
        'mouseleave': 'hoveringEnd',
        'mousedown .shape': 'draggingStart',
        'mousedown .resize': 'resizingStart',
        'mousedown .change-color': 'changeColor',
        'mousedown .delete': 'deleting'
      };

      ShapeView.prototype.hoveringStart = function() {
        return this.$('.control').removeClass('hide');
      };

      ShapeView.prototype.hoveringEnd = function() {
        return this.$('.control').addClass('hide');
      };

      ShapeView.prototype.draggingStart = function(e) {
        this.dragging = true;
        this.initialX = e.pageX - this.model.get('x');
        this.initialY = e.pageY - this.model.get('y');
        return false;
      };

      ShapeView.prototype.resizingStart = function() {
        this.resizing = true;
        return false;
      };

      ShapeView.prototype.changeColor = function() {
        return this.model.set({
          color: prompt('Enter color value')
        }, this.model.get('color'));
      };

      ShapeView.prototype.deleting = function() {
        return this.remove();
      };

      ShapeView.prototype.mouseup = function() {
        return this.dragging = this.resizing = false;
      };

      ShapeView.prototype.mousemove = function(e) {
        if (this.dragging) {
          return this.model.setTopLeft(e.pageX - this.initialX, e.pageY - this.initialY);
        } else if (this.resizing) {
          return this.model.setDim(e.pageX - this.model.get('x'), e.pageY - this.model.get('y'));
        }
      };

      return ShapeView;

    })(Backbone.View);
    shape = new Shape();
    shape.bind('change', function() {
      return $('.shape').css({
        left: shape.get('x'),
        top: shape.get('y'),
        width: shape.get('width'),
        height: shape.get('height'),
        background: shape.get('color')
      });
    });
    shape.bind('change:width', function() {});
    shape.set({
      width: 170
    });
    shape.setTopLeft(100, 100);
    shapeView = new ShapeView({
      model: shape
    });
    shapeView.render();
    shapeView.render();
    return app.addChildModel('shape', Shape);
  });

}).call(this);
