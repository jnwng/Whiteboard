$ ->
    app = window.app = new Whiteboard.AppModel()

    view = window.view = {}

    $clientCounter = $("#client_count")
    socket = io.connect 'http://localhost'

    socket.on 'connect', () ->
        socket.emit 'message',
            event: 'session'
        console.log 'connected'

    socket.on 'message', (data) ->
        console.log 'RECD:', data

        switch data.event
            when 'initial' 
                app.import data.app
                view = window.view = new AppView
                    el: $('body')
                    model: app

                view.render()
                $clientCounter.html '1'
            when 'change'
                if changedModel
                    changedModel.set data.data
                else
                    console.error 'model not found for change event', data
            when 'add'
                Whiteboard.models[data.collection].add data.data.attrs
            when 'remove'
                changedModel = Whiteboard.models[data.id]
                if changedModel and changedModel.collection
                    changedModel.collection.remove changedModel

    class Shape extends Backbone.Model
        defaults: 
            x: 50
            y: 50
            width: 150
            height: 150
            color: 'black'
        setTopLeft: (x, y) ->
            this.set
                x: x
                y: y
        setDim: (w, h) ->
            this.set
                width: w
                height: h

    class ShapeView extends Backbone.View
        initialize: () ->
            this.model.bind 'change', this.updateView, this
        render: () ->
            $("#content").append this.el
            $(this.el).html('<div class="shape"/>'+'<div class="control delete hide" />' + '<div class="control change-color hide"/>' + '<div class="control resize hide"/>').css
                    position: 'absolute'
                    padding: '10px'
            this.updateView()
            this
        updateView: () ->
            $(this.el).css
                left:   this.model.get 'x'
                top:    this.model.get 'y'
                width: (this.model.get 'width') - 10
                height: (this.model.get 'height') - 10
            this.$('.shape').css
                background: this.model.get 'color'
        events:
            'mousemove': 'mousemove'
            'mouseup': 'mouseup'
            'mouseenter .shape': 'hoveringStart'
            'mouseleave': 'hoveringEnd'
            'mousedown .shape': 'draggingStart'
            'mousedown .resize': 'resizingStart'
            'mousedown .change-color': 'changeColor'
            'mousedown .delete': 'deleting'
        hoveringStart: () ->
            this.$('.control').removeClass 'hide'
        hoveringEnd: () ->
            this.$('.control').addClass 'hide'
        draggingStart: (e) ->
            this.dragging = true
            this.initialX = e.pageX - this.model.get 'x'
            this.initialY = e.pageY - this.model.get 'y'
            false
        resizingStart: () ->
            this.resizing = true
            false
        changeColor: () ->
            this.model.set
                color: prompt 'Enter color value', this.model.get 'color'
        deleting: () ->
            this.remove()
        mouseup: () ->
            this.dragging = this.resizing = false
        mousemove: (e) ->
            if this.dragging
                this.model.setTopLeft (e.pageX - this.initialX), (e.pageY - this.initialY)
            else if this.resizing
                this.model.setDim (e.pageX - this.model.get 'x'), (e.pageY - this.model.get 'y')
                    

    shape = new Shape()
    shape.bind 'change', () ->
        $('.shape').css 
            left: shape.get 'x'
            top:  shape.get 'y'
            width: shape.get 'width'
            height: shape.get 'height'
            background: shape.get 'color'
    shape.bind 'change:width', () ->
    shape.set 
        width: 170
    shape.setTopLeft 100, 100

    shapeView = new ShapeView
        model: shape 

    shapeView.render()
    shapeView.render()
    app.addChildModel 'shape', Shape
