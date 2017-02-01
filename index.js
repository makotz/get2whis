'use strict'

const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const config = require('./config');
const mongoose = require('mongoose');
const User = require('./models/user');
const app = express()
const token = process.env.FB_PAGE_ACCESS_TOKEN

// Check if mongoose is running
mongoose.connect(config.database, function(err) {
  if(err) {
    console.log(err);
  } else {
    console.log("Yeeee");
  }
})

app.set('port', (process.env.PORT || 5000))

// Process application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}))

// Process application/json
app.use(bodyParser.json())

// Index route
app.get('/', function (req, res) {
    res.send('Hello world, I am a chat bot')
})

// for Facebook verification
app.get('/webhook/', function (req, res) {
    if (req.query['hub.verify_token'] === 'my_voice_is_my_password_verify_me') {
        res.send(req.query['hub.challenge'])
    }
    res.send('Error, wrong token')
})

// Spin up the server
app.listen(app.get('port'), function() {
    console.log('running on port', app.get('port'))
})

app.post('/webhook/', function (req, res) {
  let messaging_events = req.body.entry[0].messaging
  for (let i = 0; i < messaging_events.length; i++) {
    let event = req.body.entry[0].messaging[i]
    let sender = event.sender.id
    saveNewUser(sender)
    if (event.message && event.message.text) {
      let text = event.message.text.toLowerCase();
      if (text == "aloha") {
        sendTextMessage(sender, "Aloha, are you riding or driving?")
        continue
      } else if (text == "driving") {
        sendTextMessage(sender, "Shoots, let me get you some company")
        continue
      } else if (text == "riding") {
        sendTextMessage(sender, "Chee, lets find you a ride")
        continue
      } else if (text === 'generic') {
        sendGenericMessage(sender)
        continue
      }
      sendTextMessage(sender, "Text received, echo: " + text.substring(0, 200))
    }
    if (event.postback) {
      let text = JSON.stringify(event.postback)
      sendTextMessage(sender, "Postback received: "+text.substring(0, 200), token)
      continue
    }
  }
  res.sendStatus(200)
})

function sendTextMessage(sender, text) {
    let messageData = { text:text }
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token:token},
        method: 'POST',
        json: {
            recipient: {id:sender},
            message: messageData,
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending messages: ', error)
        } else if (response.body.error) {
            console.log('Error: ', response.body.error)
        }
    })
}

function sendGenericMessage(sender) {
    let messageData = {
        "attachment": {
            "type": "template",
            "payload": {
                "template_type": "generic",
                "elements": [{
                    "title": "First card",
                    "subtitle": "Element #1 of an hscroll",
                    "image_url": "http://messengerdemo.parseapp.com/img/rift.png",
                    "buttons": [{
                        "type": "web_url",
                        "url": "https://www.messenger.com",
                        "title": "web url"
                    }, {
                        "type": "postback",
                        "title": "Postback",
                        "payload": "Payload for first element in a generic bubble",
                    }],
                }, {
                    "title": "Second card",
                    "subtitle": "Element #2 of an hscroll",
                    "image_url": "http://messengerdemo.parseapp.com/img/gearvr.png",
                    "buttons": [{
                        "type": "postback",
                        "title": "Postback",
                        "payload": "Payload for second element in a generic bubble",
                    }],
                }]
            }
        }
    }
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token:token},
        method: 'POST',
        json: {
            recipient: {id:sender},
            message: messageData,
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending messages: ', error)
        } else if (response.body.error) {
            console.log('Error: ', response.body.error)
        }
    })
}

function saveNewUser(sender){
  request('https://graph.facebook.com/v2.6/'+sender+'?access_token='+token,       function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var user = new User({
        first_name: response.body[0],
        last_name: response.body[1];
        profile_pic: response.body[2];
        gender: response.body[6];
      });
      user.save(function(err) {
        if(err) {
          console.log(err);
        } else {
          console.log("User created!");
        }
      })
    } else {
    console.log('User API did not go through.')
    }
  })
};

function getSenderInfo(sender){
    request('https://graph.facebook.com/v2.6/'+sender+'?access_token='+token, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      console.log("first name is"+response.body[0])
      var first_name = response.body[0]
    } else {
      console.log('something went wrong...')
    }
  })
}
