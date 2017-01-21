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

// Spin up the server
app.listen(app.get('port'), function() {
  console.log('running on port', app.get('port'))
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

// var user = new User({
//     sender: req.body.entry[0].messaging[0].sender.id
// });
//
// user.save(function(err) {
//   if(err) {
//     console.log(err);
//   } else {
//     console.log("User created!");
//   }
// });

app.post('/webhook/', function (req, res) {
    let messaging_events = req.body.entry[0].messaging
    var SenderID = req.body.entry[0].messaging[0].sender.id
    for (let i = 0; i < messaging_events.length; i++) {
           let event = req.body.entry[0].messaging[i]
           let sender = event.sender.id
           if (event.message && event.message.text) {
               let text = event.message.text
              //  if (text === 'hey') {
              //    greetUser(sender)
              //  } else if (text === 'driving') {
              //      lookUpRider(sender)
              //      continue
              //  } else if (text === 'riding') {
              //      lookUpDriver(sender)
              //      continue
              //  } else {
                 sendTextMesssage(sender, "Text received, echo: " + text.substring(0, 200))
              //  }
          }
        }
    res.sendStatus(200)
})

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

// function greetUser(sender) {
//     getSenderInfo(sender)
//     request({
//         url: 'https://graph.facebook.com/v2.6/me/messages',
//         qs: {access_token:token},
//         method: 'POST',
//         json: {
//             recipient: {id:sender},
//             message: {text:first_name},
//         }
//     }, function(error, response, body) {
//         if (error) {
//             console.log('Error sending messages: ', error)
//         } else if (response.body.error) {
//             console.log('Error: ', response.body.error)
//         }
//     })
// };
//
// function lookUpRider(sender) {
//     let messageData = { text:text }
//     request({
//         url: 'https://graph.facebook.com/v2.6/me/messages',
//         qs: {access_token:token},
//         method: 'POST',
//         json: {
//             recipient: {id:sender},
//             message: messageData,
//         }
//     }, function(error, response, body) {
//         if (error) {
//             console.log('Error sending messages: ', error)
//         } else if (response.body.error) {
//             console.log('Error: ', response.body.error)
//         }
//     })
// };

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
