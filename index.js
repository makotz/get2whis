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
    if (quickReplyPayload == "Looking_for_riders" || "Looking_for_drivers") {
      askDepartureLocation(senderID, quickReplyPayload);
    }
    if (metadata.drive_or_ride) {
      askDepartureTime(senderID, quickReplyPayload, metadata.drive_or_ride)
    }
    if (metadata.departure_location && metadata.drive_or_ride) {
      sendTextMessage(senderID, "Sweet looking for "+ metadata.drive_or_ride+" from "+metadata.departure_location+ "@" + quickReplyPayload)
    }
    console.log("Quick reply for message %s with payload %s", messageId, quickReplyPayload);
    return;
  }

  if (messageText) {

    // If we receive a text message, check to see if it matches any special
    // keywords and send back the corresponding example. Otherwise, just echo
    // the text we received.
    switch (messageText) {
      case 'topsecret':
        sendDriveOrRide(senderID);
        break;

      case 'aloha':
        askDriveOrRide(senderID);
        break;
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

function askDriveOrRide(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: "Aloha, are you driving or riding today?",
      quick_replies: [
        {
          "content_type":"text",
          "title":"Driving",
          "payload":"Looking_for_riders"
        },
        {
          "content_type":"text",
          "title":"Riding",
          "payload":"Looking_for_drivers"
        }
      ]
    }
  };
  callSendAPI(messageData);
}

function askDepartureLocation(recipientId, drivingOrRiding) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: "Cool, where do you want a ride from?",
      quick_replies: [
        {
          "content_type":"text",
          "title":"Vancouver",
          "payload":"Vancouver"
        },
        {
          "content_type":"text",
          "title":"Richmond",
          "payload":"Richmond"
        },
        {
          "content_type":"text",
          "title":"UBC",
          "payload":"UBC"
        },
        {
          "content_type":"text",
          "title":"Burnaby",
          "payload":"Burnaby"
        },
        {
          "content_type":"location",
        }
      ]
    },
    metadata: {
      "drive_or_ride": drivingOrRiding
    }
  };
  callSendAPI(messageData);
}

function askDepartureTime(recipientId, drivingOrRiding, departureLocation) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: "What time do you want to go?",
      quick_replies: [
        {
          "content_type":"text",
          "title":"Early Morning",
          "payload":"Early_morning"
        },
        {
          "content_type":"text",
          "title":"Before Noon",
          "payload":"Before_noon"
        },
        {
          "content_type":"text",
          "title":"Early Afternoon",
          "payload":"Early_afternoon"
        },
        {
          "content_type":"text",
          "title":"Evening",
          "payload":"Evening"
        },
        {
          "content_type":"text",
          "title":"Late Night",
          "payload":"Late_night"
        }
      ]
    },
    metadata: {
      "drive_or_ride": drivingOrRiding,
      "departure_location": departureLocation
    }
  };
  callSendAPI(messageData);
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
              payload: "Ride Requested"
            }]
          }]
        }
      }
    }
  };
  callSendAPI(messageData);
}



// function askFromWhereAndWhe(recipientId) {
//   var messageData = {
//     recipient: {
//       id: recipientId
//     },
//     message: {
//       attachment: {
//         type: "template",
//         payload: {
//           template_type: "generic",
//           elements: [{
//             title: "PowHunt",
//             subtitle: "Welcome! Do you wanna Drive or Ride?",
//             item_url: "https://www.nfl.com",
//             image_url: "http://i.imgur.com/K1WNRhX.jpg",
//             buttons: [{
//               type: "postback",
//               title: "Drive",
//               payload: "Ride Offered"
//             }, {
//               type: "postback",
//               title: "Ride",
//               payload: "Ride Requested"
//             }]
//           }]
//         }
//       }
//     }
//   };
//   callSendAPI(messageData);
// }

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


function findFBProfile(sender){
  var user;
  request('https://graph.facebook.com/v2.6/'+sender+'?fields=first_name,last_name,profile_pic,locale,timezone,gender&access_token='+token,
  function (error, response, body) {
    if (!error && response.statusCode == 200) {
      user = JSON.parse(body);
      console.log('Found profile of: '+ user["first_name"]);
    } else {
      console.log("Could not locate %s's Facebook Profile", senderID);
    }
  });
  return user;
};


// var user = new User({
//   sender: sender,
//   first_name: ddd["first_name"],
//   last_name: ddd["last_name"],
//   profile_pic: ddd["profile_pic"],
//   gender: ddd["gender"]
// });
// user.save(function(err) {
//   if(err) {
//     console.log(err);
//   } else {
//     console.log("User created!");
//   }
// })
