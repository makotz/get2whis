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
  var data = req.body;

  // Make sure this is a page subscription
  if (data.object == 'page') {
     // Iterate over each entry
     // There may be multiple if batched
     data.entry.forEach(function(pageEntry) {
       var pageID = pageEntry.id;
       var timeOfEvent = pageEntry.time;

       // Iterate over each messaging event
       pageEntry.messaging.forEach(function(messagingEvent) {
        //  if (messagingEvent.optin) {
        //    receivedAuthentication(messagingEvent);
        //  } else
            if (messagingEvent.message) {
              receivedMessage(messagingEvent);
        //  } else if (messagingEvent.delivery) {
        //    receivedDeliveryConfirmation(messagingEvent);
            } else if (messagingEvent.postback) {
              receivedPostback(messagingEvent);
        //  } else if (messagingEvent.read) {
        //    receivedMessageRead(messagingEvent);
        //  } else if (messagingEvent.account_linking) {
        //    receivedAccountLink(messagingEvent);
        //  }
            } else {
           console.log("Webhook received unknown messagingEvent: ", messagingEvent);
         }
       });
     });
     res.sendStatus(200)
   }

  // // Old format
  // let messaging_events = req.body.entry[0].messaging
  // // console.log(JSON.stringify(messaging_events))
  // for (let i = 0; i < messaging_events.length; i++) {
  //   let event = req.body.entry[0].messaging[i]
  //   let sender = event.sender.id
  //   // saveNewUser(sender)
  //   if (event.message && event.message.text) {
  //     let text = event.message.text.toLowerCase();
  //     if (text == "aloha") {
  //       sendTextMessage(sender, "Aloha, are you riding or driving?")
  //       continue
  //     } else if (text == "driving") {
  //       sendTextMessage(sender, "Shoots, let me get you some company")
  //       continue
  //     } else if (text == "riding") {
  //       sendTextMessage(sender, "Chee, lets find you a ride")
  //       continue
  //     } else if (text === 'generic') {
  //       sendGenericMessage(sender)
  //       continue
  //     }
  //     sendTextMessage(sender, "Text received, echo: " + text.substring(0, 200))
  //   }
    // if (event.postback) {
    //   let text = JSON.stringify(event.postback)
    //   sendTextMessage(sender, "Postback received: "+text.substring(0, 200), token)
    //   continue
    // }
});

function receivedMessage(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;

  console.log("Received message for user %d and page %d at %d with message:",
    senderID, recipientID, timeOfMessage);
  console.log(JSON.stringify(message));

  var isEcho = message.is_echo;
  var messageId = message.mid;
  var appId = message.app_id;
  var metadata = message.metadata;

  // You may get a text or attachment but not both
  var messageText = message.text;
  var messageAttachments = message.attachments;
  var quickReply = message.quick_reply;

  if (isEcho) {
    // Just logging message echoes to console
    console.log("Received echo for message %s and app %d with metadata %s",
      messageId, appId, metadata);
    return;
  } else if (quickReply) {
    var quickReplyPayload = quickReply.payload;
    console.log("Quick reply for message %s with payload %s",
      messageId, quickReplyPayload);

    sendTextMessage(senderID, "Quick reply tapped");
    return;
  }

if (messageText) {

    // If we receive a text message, check to see if it matches any special
    // keywords and send back the corresponding example. Otherwise, just echo
    // the text we received.
    switch (messageText) {
      case 'aloha':
        sendDriveOrRide(senderID);
        break;
      //
      //       case 'gif':
      //         sendGifMessage(senderID);
      //         break;
      //
      //       case 'audio':
      //         sendAudioMessage(senderID);
      //         break;
      //
      //       case 'video':
      //         sendVideoMessage(senderID);
      //         break;
      //
      //       case 'file':
      //         sendFileMessage(senderID);
      //         break;
      //
      //       case 'button':
      //         sendButtonMessage(senderID);
      //         break;
      //
      //       case 'generic':
      //         sendGenericMessage(senderID);
      //         break;
      //
      //       case 'receipt':
      //         sendReceiptMessage(senderID);
      //         break;
      //
      //       case 'quick reply':
      //         sendQuickReply(senderID);
      //         break;
      //
      //       case 'read receipt':
      //         sendReadReceipt(senderID);
      //         break;
      //
      //       case 'typing on':
      //         sendTypingOn(senderID);
      //         break;
      //
      //       case 'typing off':
      //         sendTypingOff(senderID);
      //         break;
      //
      //       case 'account linking':
      //         sendAccountLinking(senderID);
      //         break;

      default:
        sendTextMessage(senderID, messageText);
    }
  } else if (messageAttachments) {
    sendTextMessage(senderID, "Message with attachment received");
  }
}


function sendTextMessage(recipientId, messageText) {

  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText,
      metadata: "DEVELOPER_DEFINED_METADATA"
    }
  };

  callSendAPI(messageData);
}

function sendDriveOrRide(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [{
            title: "PowHunt",
            subtitle: "Welcome! Do you wanna Drive or Ride?",
            item_url: "https://www.nfl.com",
            image_url: "http://i.imgur.com/K1WNRhX.jpg",
            buttons: [{
              type: "postback",
              title: "Drive",
              payload: "Ride Offered"
            }, {
              type: "postback",
              title: "Ride",
              payload: "Ride Requested",
            }]
          }]
        }
      }
    }
  };
  callSendAPI(messageData);
}

function receivedPostback(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfPostback = event.timestamp;
  var payload = event.postback.payload;
  if (payload == "Ride Offered") {
    sendTextMessage(senderID, "Sweet, lets find you some company!");
  else if (payload == "Ride Requested") {
    sendTextMessage(senderID, "Nice, lets find you a ride!");
  }
}

// all API requests
function callSendAPI(messageData) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: token },
    method: 'POST',
    json: messageData

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;

      if (messageId) {
        console.log("Successfully sent message with id %s to recipient %s",
          messageId, recipientId);
      } else {
      console.log("Successfully called Send API for recipient %s",
        recipientId);
      }
    } else {
      console.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
    }
  });
}


function saveNewUser(sender){
  request('https://graph.facebook.com/v2.6/'+sender+'?access_token='+token,       function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var ddd = response.body
      var user = new User({
        sender: sender,
        first_name: ddd["first_name"],
        last_name: ddd["last_name"],
        profile_pic: ddd["profile_pic"],
        gender: ddd["gender"]
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
