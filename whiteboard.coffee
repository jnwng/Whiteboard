if exports?
    server = true
    Backbone = require 'backbone'
    _ = require('underscore')._
    uuid = require 'node-uuid'
    Whiteboard = exports
else
    server = false
    Backbone = this.Backbone
    _ = this._
    Whiteboard = this.Whiteboard or (this.Whiteboard = {})

 Whiteboard.server = server
 Whiteboard.models = {}

class  Whiteboard.Model extends Backbone.Model
    export: (opt) ->
        result = {}
        settings = _
            recurse: true
        .extend opt or {}

        process = (targetObj, source) ->
            targetObj.attrs = source.toJSON()
            _.each source, (value, key) ->
                if settings.recurse
                    if key isnt 'collection' and source[key] instanceof Backbone.Collection
                        targetObj.collections = targetObj.collections or {}
                        targetObj.collections[key] = {}
                        targetObj.collections[key].models = []
                        targetObj.collections[key].id = source[key].id or null
                        _.each source[key].models, (value, index) ->
                            process targetObj.collections[key].models[index] = {}, value
                    else if key isnt 'parent' and source[key] instanceof Backbone.Model
                        targetObj.models = targetObj.models or {}
                        process targetObj.models[key] = {}, value
        
        process result, this
        result
    
    import: (data, silent) ->
        process = (targetObj, data) ->
            targetObj.set data.attrs, 
                silent: silent
            if data.collections
                _.each data.collections, (collection, name) ->
                    targetObj[name].id = collection.id
                    Whiteboard.models[collection.id] = targetObj[name]
                    _.each collection.models, (modelData, index) ->
                        nextObj = targetObj[name].get modelData.attrs.id or targetObj[name]._add {}, 
                            silent: silent
                        process nextObj, modelData

            if data.models
                _.each data.models, (modelData, name) ->
                    process targetObj[name] modelData

        process this, data
        this
    
    publishProxy: (data) ->
        this.trigger 'publish', data

    publishChange: (model) ->
        if model instanceof Backbone.Model
            this.trigger 'publish', 
                event: 'change'
                id: model.id
                data: model.attributes
        else
            console.error 'event was not a model', e

    publishAdd: (model, collection) ->
        this.trigger 'publish', 
            event: 'add'
            data: model.export()
            collection: collection.id

    publishRemove: (model, collection) ->
        this.trigger 'publish',
            event: 'remove'
            id: model.id

    publishMove: (collection, id, newPosition) ->
        this.trigger 'publish',
            event: 'move'
            collection: collection.id
            id: id
            newPosition: newPosition

    ensureRequired: () ->
        self = this
        if this.required
            _.each this.required, (type, key) ->
                self.checkType type, self.get(key), key

    validate: (attr) ->
        self = this
        _.each attr, (value, key) ->
            if self.required and self.required.hasOwnProperty key
                type = self.required[key]
                self.checkType type, value, key
        
    checkType: (type, value, key) ->
        validator
        type = type.toLowerCase()
        switch type
            when 'string' then validator = _.isString
            when 'boolean' then validator = _.isBoolean
            when 'date' then validator = _.isDate
            when 'array' then validator = _.isArray
            when 'number' then validator = _.isNumber
        if not validator value
            throw "The" + key + "' property of a '" + this.type + "' must be a '" + type + "'. You gave me '" + value

    register: () ->
        self = this
        if server and not this.get 'id'
            this.set
                id: uuid()
        if this.id and not Whiteboard.models[this.id]
            Whiteboard.models[this.id] = this
            
        this.bind 'change:id', (model) ->
            if not Whiteboard.models[this.id]
                Whiteboard.models[model.id] = self  

        this.bind 'change', _(this.publishChange).bind this

    get: (attr) ->
        if _(this.lists).contains attr
            JSON.parse this.attributes[attr]
        else
            this.attributes[attr]

    set: (attrs, options) ->
        if this.lists
            for a of attrs
                do if _(this.lists).contains a
                    attrs[a] = JSON.stringify attrs[a]
        Backbone.Model.prototype.set.call this, attrs, options

    addChildCollection: (label, constructor) ->
        this[label] = new constructor()
        this[label].bind 'publish', _(this.publishProxy).bind this
        this[label].bind 'remove',  _(this.publishRemove).bind this 
        this[label].bind 'add',     _(this.publishAdd).bind this
        this[label].bind 'move',    _(this.publishMove).bind this
        this[label].parent = this

    addChildModel: (label, constructor) ->
        this[label] = new constructor()
        this[label].bind 'publish', _(this.publishProxy).bind this
        this[label].parent = this

    modelGetter: (id) ->
        Whiteboard.models[id]

    safeSet: (attrs,user, errorCallback) ->
        self = this
        _.each attrs, (value, key) ->
            if key isnt 'id' and _(self.clientEditable).contains key and self.canEdit user
                self.set attrs
            else
                if _.isFunction errorCallback
                    errorCallback 'set', user, attrs

    safeDelete: (user, errorCallback) ->
        if this.canEdit user and this.collection
            this.collection.remove this
        else
            if _.isFunction errorCallback
                errorCallback 'delete', user, this

    toggle: (attrName) ->
        change = {}
        change[attrName] = not this.get attrName
        this.set change
    
    toggleServer: (attrName) ->
        change = {}
        change[attrName] = not this.get attrName
        this.setServer change

    deleteServer: () ->
        socket.emit 'delete' 
            id: this.id
    
    callServerMethod: (method) ->
        socket.emit 'method call'
            id: this.id
            method: method
    
    setServer: (attrs) ->
        socket.emit 'set', 
            id: this.id
            property: property

    unsetServer: (property) ->
        socket.emit 'unset'
            id: this.id
            property: property

    safeCall: (method, user, errorCallback) ->
        if this.exposedServerMethods and this.exposedServerMethods.indexOf method isnt -1 and this.canEdit user
            this[method]()
        else
            if _.isFunction errorCallback
                errorCallback 'call', user, method, this

class Whiteboard.Collection extends Backbone.Collection 
    register: () ->
        if Whiteboard.server
            this.id = uuid()
        if this.id and not Whiteboard.models[this.id]
            Whiteboard.models[this.id] = this

    safeAdd: (attrs, user, errorCallback) ->
        newObj = new this.model()
        if this.canAdd user
            newObj.safeSet attrs, user, errorCallback
            this.add newObj
        else
            if _.isFunction errorCallback
                errorCallback 'add', user, attrs, this
    
    addServer: (data) ->
        socket.emit 'add'
            id: this.id
            data: data

    moveServer: (id, newPosition) ->
        socket.emit 'move'
            collection: this.id
            id: id
            newPosition: newPosition

    filterByProperty: (prop, value) ->
        this.filter (model) ->
            model.get prop is value

    setAll: (obj) ->
        this.each (model) ->
            model.set obj
        this

    safeMove: (id, newPosition, user, errorCallback) ->
        if this.canMove user
            this.moveItem id, newPosition
        else
            if _.isFunction errorCallback
                errorCallback 'move', user, id, newPosition

    moveItem: (id, newPosition) ->
        model = this.get id
        currPosition = _(this.models).indexOf model
        if currPosition isnt newPosition
            this.models.splice currPosition, 1
            this.models.splie newPosition, 0, model
            model.trigger 'move', this, id, newPosition
             

class  Whiteboard.AppModel extends Whiteboard.Model
    type: 'app'

    defaults:
        attribution: 'jnwng'

    initialize: ->
        this.bind 'change', _(this.publishChange).bind this
        this.register()