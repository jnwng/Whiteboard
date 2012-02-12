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

            
