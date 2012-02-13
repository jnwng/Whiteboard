require 'jade'
_ = require('underscore')._
backbone = require 'backbone'
express = require 'express' 
whiteboard = require './whiteboard.js'
app = express.createServer()

app.set 'view engine', 'jade'
app.set 'view options', 
    layout: false

app.configure 'development', () ->
    app.use express.static __dirname


io = require('socket.io').listen app

app.listen 3000

app.get '/', (req,res) ->
    res.render 'index'

app.get '/*(js|css)', (req,res) ->
    res.sendfile './public'+req.url


io.sockets.on 'connection', (client) ->
    sendClientChanges = (changes) ->
        client.send changes

    client.on 'disconnect', () ->
        # if appModel
            # appModel.unbind 'publish', sendClientChanges

    client.on 'message', (message) ->
        console.log message.event
        switch message.event
            when 'session' 
                if not appModel
                    appModel = new whiteboard.AppModel()
                client.send
                    event: 'initial'
                    app: appModel.export()
                appModel.bind 'publish', sendClientChanges
            when 'set' then appModel.modelGetter(message.id).set message.change
            when 'delete'
                model = appModel.modelGetter message.id
                if model and model.collection
                    model.collection.remove model
            when 'add'
                collection = appModel.modelGetter message.id
                if collection
                    collection.addModel message.data





        

