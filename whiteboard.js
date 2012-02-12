(function() {
  var Backbone, Whiteboard, server, uuid, _,
    __hasProp = Object.prototype.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

  if (typeof exports !== "undefined" && exports !== null) {
    server = true;
    Backbone = require('backbone');
    _ = require('underscore')._;
    uuid = require('node-uuid');
    Whiteboard = exports;
  } else {
    server = false;
    Backbone = this.Backbone;
    _ = this._;
    Whiteboard = this.Whiteboard || (this.Whiteboard = {});
  }

  Whiteboard.server = server;

  Whiteboard.models = {};

  Whiteboard.Model = (function(_super) {

    __extends(Model, _super);

    function Model() {
      Model.__super__.constructor.apply(this, arguments);
    }

    Model.prototype["export"] = function(opt) {
      var process, result, settings;
      result = {};
      settings = _({
        recurse: true
      }).extend(opt || {});
      process = function(targetObj, source) {
        targetObj.attrs = source.toJSON();
        return _.each(source, function(value, key) {
          if (settings.recurse) {
            if (key !== 'collection' && source[key] instanceof Backbone.Collection) {
              targetObj.collections = targetObj.collections || {};
              targetObj.collections[key] = {};
              targetObj.collections[key].models = [];
              targetObj.collections[key].id = source[key].id || null;
              return _.each(source[key].models, function(value, index) {
                return process(targetObj.collections[key].models[index] = {}, value);
              });
            } else if (key !== 'parent' && source[key] instanceof Backbone.Model) {
              targetObj.models = targetObj.models || {};
              return process(targetObj.models[key] = {}, value);
            }
          }
        });
      };
      process(result, this);
      return result;
    };

    Model.prototype["import"] = function(data, silent) {
      var process;
      process = function(targetObj, data) {
        targetObj.set(data.attrs, {
          silent: silent
        });
        if (data.collections) {
          _.each(data.collections, function(collection, name) {
            targetObj[name].id = collection.id;
            Whiteboard.models[collection.id] = targetObj[name];
            return _.each(collection.models, function(modelData, index) {
              var nextObj;
              nextObj = targetObj[name].get(modelData.attrs.id || targetObj[name]._add({}, {
                silent: silent
              }));
              return process(nextObj, modelData);
            });
          });
        }
        if (data.models) {
          return _.each(data.models, function(modelData, name) {
            return process(targetObj[name](modelData));
          });
        }
      };
      process(this, data);
      return this;
    };

    Model.prototype.publishProxy = function(data) {
      return this.trigger('publish', data);
    };

    Model.prototype.publishChange = function(model) {
      if (model instanceof Backbone.Model) {
        return this.trigger('publish', {
          event: 'change',
          id: model.id,
          data: model.attributes
        });
      } else {
        return console.error('event was not a model', e);
      }
    };

    Model.prototype.publishAdd = function(model, collection) {
      return this.trigger('publish', {
        event: 'add',
        data: model["export"](),
        collection: collection.id
      });
    };

    Model.prototype.publishRemove = function(model, collection) {
      return this.trigger('publish', {
        event: 'remove',
        id: model.id
      });
    };

    Model.prototype.publishMove = function(collection, id, newPosition) {
      return this.trigger('publish', {
        event: 'move',
        collection: collection.id,
        id: id,
        newPosition: newPosition
      });
    };

    Model.prototype.ensureRequired = function() {
      var self;
      self = this;
      if (this.required) {
        return _.each(this.required, function(type, key) {
          return self.checkType(type, self.get(key), key);
        });
      }
    };

    Model.prototype.validate = function(attr) {
      var self;
      self = this;
      return _.each(attr, function(value, key) {
        var type;
        if (self.required && self.required.hasOwnProperty(key)) {
          type = self.required[key];
          return self.checkType(type, value, key);
        }
      });
    };

    Model.prototype.checkType = function(type, value, key) {
      validator;
      var validator;
      type = type.toLowerCase();
      switch (type) {
        case 'string':
          validator = _.isString;
          break;
        case 'boolean':
          validator = _.isBoolean;
          break;
        case 'date':
          validator = _.isDate;
          break;
        case 'array':
          validator = _.isArray;
          break;
        case 'number':
          validator = _.isNumber;
      }
      if (!validator(value)) {
        throw "The" + key + "' property of a '" + this.type + "' must be a '" + type + "'. You gave me '" + value;
      }
    };

    Model.prototype.register = function() {
      var self;
      self = this;
      if (server && !this.get('id')) {
        this.set({
          id: uuid()
        });
      }
      if (this.id && !Whiteboard.models[this.id]) {
        Whiteboard.models[this.id] = this;
      }
      this.bind('change:id', function(model) {
        if (!Whiteboard.models[this.id]) return Whiteboard.models[model.id] = self;
      });
      return this.bind('change', _(this.publishChange).bind(this));
    };

    Model.prototype.get = function(attr) {
      if (_(this.lists).contains(attr)) {
        return JSON.parse(this.attributes[attr]);
      } else {
        return this.attributes[attr];
      }
    };

    Model.prototype.set = function(attrs, options) {
      var a;
      if (this.lists) {
        for (a in attrs) {
          (_(this.lists).contains(a) ? attrs[a] = JSON.stringify(attrs[a]) : void 0)();
        }
      }
      return Backbone.Model.prototype.set.call(this, attrs, options);
    };

    Model.prototype.addChildCollection = function(label, constructor) {
      this[label] = new constructor();
      this[label].bind('publish', _(this.publishProxy).bind(this));
      this[label].bind('remove', _(this.publishRemove).bind(this));
      this[label].bind('add', _(this.publishAdd).bind(this));
      this[label].bind('move', _(this.publishMove).bind(this));
      return this[label].parent = this;
    };

    Model.prototype.addChildModel = function(label, constructor) {
      this[label] = new constructor();
      this[label].bind('publish', _(this.publishProxy).bind(this));
      return this[label].parent = this;
    };

    Model.prototype.modelGetter = function(id) {
      return Whiteboard.models[id];
    };

    Model.prototype.safeSet = function(attrs, user, errorCallback) {
      var self;
      self = this;
      return _.each(attrs, function(value, key) {
        if (key !== 'id' && _(self.clientEditable).contains(key && self.canEdit(user))) {
          return self.set(attrs);
        } else {
          if (_.isFunction(errorCallback)) {
            return errorCallback('set', user, attrs);
          }
        }
      });
    };

    Model.prototype.safeDelete = function(user, errorCallback) {
      if (this.canEdit(user && this.collection)) {
        return this.collection.remove(this);
      } else {
        if (_.isFunction(errorCallback)) {
          return errorCallback('delete', user, this);
        }
      }
    };

    Model.prototype.toggle = function(attrName) {
      var change;
      change = {};
      change[attrName] = !this.get(attrName);
      return this.set(change);
    };

    Model.prototype.toggleServer = function(attrName) {
      var change;
      change = {};
      change[attrName] = !this.get(attrName);
      return this.setServer(change);
    };

    Model.prototype.deleteServer = function() {
      return socket.emit('delete', {
        id: this.id
      });
    };

    Model.prototype.callServerMethod = function(method) {
      return socket.emit('method call', {
        id: this.id,
        method: method
      });
    };

    Model.prototype.setServer = function(attrs) {
      return socket.emit('set', {
        id: this.id,
        property: property
      });
    };

    Model.prototype.unsetServer = function(property) {
      return socket.emit('unset', {
        id: this.id,
        property: property
      });
    };

    Model.prototype.safeCall = function(method, user, errorCallback) {
      if (this.exposedServerMethods && this.exposedServerMethods.indexOf(method !== -1 && this.canEdit(user))) {
        return this[method]();
      } else {
        if (_.isFunction(errorCallback)) {
          return errorCallback('call', user, method, this);
        }
      }
    };

    return Model;

  })(Backbone.Model);

  Whiteboard.Collection = (function(_super) {

    __extends(Collection, _super);

    function Collection() {
      Collection.__super__.constructor.apply(this, arguments);
    }

    Collection.prototype.register = function() {
      if (Whiteboard.server) this.id = uuid();
      if (this.id && !Whiteboard.models[this.id]) {
        return Whiteboard.models[this.id] = this;
      }
    };

    Collection.prototype.safeAdd = function(attrs, user, errorCallback) {
      var newObj;
      newObj = new this.model();
      if (this.canAdd(user)) {
        newObj.safeSet(attrs, user, errorCallback);
        return this.add(newObj);
      } else {
        if (_.isFunction(errorCallback)) {
          return errorCallback('add', user, attrs, this);
        }
      }
    };

    Collection.prototype.addServer = function(data) {
      return socket.emit('add', {
        id: this.id,
        data: data
      });
    };

    Collection.prototype.moveServer = function(id, newPosition) {
      return socket.emit('move', {
        collection: this.id,
        id: id,
        newPosition: newPosition
      });
    };

    Collection.prototype.filterByProperty = function(prop, value) {
      return this.filter(function(model) {
        return model.get(prop === value);
      });
    };

    Collection.prototype.setAll = function(obj) {
      this.each(function(model) {
        return model.set(obj);
      });
      return this;
    };

    Collection.prototype.safeMove = function(id, newPosition, user, errorCallback) {
      if (this.canMove(user)) {
        return this.moveItem(id, newPosition);
      } else {
        if (_.isFunction(errorCallback)) {
          return errorCallback('move', user, id, newPosition);
        }
      }
    };

    Collection.prototype.moveItem = function(id, newPosition) {
      var currPosition, model;
      model = this.get(id);
      currPosition = _(this.models).indexOf(model);
      if (currPosition !== newPosition) {
        this.models.splice(currPosition, 1);
        this.models.splie(newPosition, 0, model);
        return model.trigger('move', this, id, newPosition);
      }
    };

    return Collection;

  })(Backbone.Collection);

  Whiteboard.AppModel = (function(_super) {

    __extends(AppModel, _super);

    function AppModel() {
      AppModel.__super__.constructor.apply(this, arguments);
    }

    AppModel.prototype.type = 'app';

    AppModel.prototype.defaults = {
      attribution: 'jnwng'
    };

    AppModel.prototype.initialize = function() {
      this.bind('change', _(this.publishChange).bind(this));
      return this.register();
    };

    return AppModel;

  })(Whiteboard.Model);

}).call(this);
