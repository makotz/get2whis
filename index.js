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
    if (err) {
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
app.get('/', function(req, res) {
    res.send('Hello world, I am a chat bot')
})

// for Facebook verification
app.get('/webhook/', function(req, res) {
    if (req.query['hub.verify_token'] === 'my_voice_is_my_password_verify_me') {
        res.send(req.query['hub.challenge'])
    }
    res.send('Error, wrong token')
})

// Spin up the server
app.listen(app.get('port'), function() {
    console.log('running on port', app.get('port'))
})

app.post('/webhook/', function(req, res) {
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
                if (messagingEvent.optin) {
                    receivedAuthentication(messagingEvent);
                } else if (messagingEvent.message) {
                    receivedMessage(messagingEvent);
                } else if (messagingEvent.delivery) {
                    receivedDeliveryConfirmation(messagingEvent);
                } else if (messagingEvent.postback) {
                    receivedPostback(messagingEvent);
                } else if (messagingEvent.read) {
                    receivedMessageRead(messagingEvent);
                } else if (messagingEvent.account_linking) {
                    receivedAccountLink(messagingEvent);
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

    console.log("Received message for user %d and page %d at %d with message:", senderID, recipientID, timeOfMessage);
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
        console.log("Received echo for message %s and app %d with metadata %s", messageId, appId, metadata);
        return;
    } else if (quickReply) {
        var quickReplyPayload = quickReply.payload;
        console.log("Quick reply for message %s with payload %s", messageId, quickReplyPayload);
        // Includes all 3 data
        if (quickReplyPayload.includes('drive_or_ride') && quickReplyPayload.includes('departure_location') && quickReplyPayload.includes('departure_time') && quickReplyPayload.includes('departure_date')) {
          parseConditions(quickReplyPayload);
          return
          findFBProfile(senderID);
          console.log("user is ... "+user);
          console.log("and parsedObject is ... "+parsedObject);
          // PICKUP HERE Add to database if driver
          // Query database if rider
          sendTextMessage(senderID, "Got all 4 data points! Cheehee");
        }
        if (!quickReplyPayload.includes('drive_or_ride')) {
          askDriveOrRide(senderID, quickReplyPayload);
          return
        }
        if (!quickReplyPayload.includes('departure_location')) {
          askDepartureLocation(senderID, quickReplyPayload);
          return
        }
        if (!quickReplyPayload.includes('departure_time')) {
          askDepartureTime(senderID, quickReplyPayload);
          return
        }
        if (!quickReplyPayload.includes('departure_date')) {
          askDepartureDate(senderID, quickReplyPayload);
          return
        }
        sendTextMessage(senderID, "Quick reply tapped");
        return;
    }

    if (messageText) {
        // If we receive a text message, check to see if it matches any special
        // keywords and send back the corresponding example. Otherwise, just echo
        // the text we received.
        switch (messageText) {
            // case 'topsecret':
            //     sendDriveOrRide(senderID);
            //     break;

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
                    "content_type": "text",
                    "title": "Driving",
                    "payload": "drive_or_ride:looking_for_riders,"
                }, {
                    "content_type": "text",
                    "title": "Riding",
                    "payload": "drive_or_ride:looking_for_drivers,"
                }
            ]
        }
    };
    callSendAPI(messageData);
}
function askDepartureLocation(recipientId, othervariables) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            text: "Cool, where do you want a ride from?",
            quick_replies: [
                {
                    "content_type": "text",
                    "title": "UBC",
                    "payload": othervariables+"departure_location:UBC,"
                }, {
                    "content_type": "text",
                    "title": "Whistler",
                    "payload": othervariables+"departure_location:Whistler,"
                }
            ]
        }
    };
    callSendAPI(messageData);
}
function askDepartureDate(recipientId, othervariables) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            text: "Cool, where do you want a ride from?",
            quick_replies: [
                {
                    "content_type": "text",
                    "title": "today",
                    "payload": othervariables+"departure_date:today,"
                }, {
                    "content_type": "text",
                    "title": "tomorrow",
                    "payload": othervariables+"departure_date:tomorrow,"
                }
            ]
        }
    };
    callSendAPI(messageData);
}
function askDepartureTime(recipientId, othervariables) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            text: "What time do you want to go?",
            quick_replies: [
                {
                    "content_type": "text",
                    "title": "Early Morning",
                    "payload": othervariables+"departure_time:Early_morning"
                }, {
                    "content_type": "text",
                    "title": "Before Noon",
                    "payload": othervariables+"departure_time:Before_noon"
                }, {
                    "content_type": "text",
                    "title": "Early Afternoon",
                    "payload": othervariables+"departure_time:Early_afternoon"
                }, {
                    "content_type": "text",
                    "title": "Evening",
                    "payload": othervariables+"departure_time:Evening"
                }, {
                    "content_type": "text",
                    "title": "Late Night",
                    "payload": othervariables+"departure_time:Late_night"
                }
            ]
        }
    };
    callSendAPI(messageData);
}
function receivedPostback(event) {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var timeOfPostback = event.timestamp;

    // The 'payload' param is a developer-defined field which is set in a postback
    // button for Structured Messages.
    var payload = event.postback.payload;

    console.log("Received postback for user %d and page %d with payload '%s' " +
        "at %d",
    senderID, recipientID, payload, timeOfPostback);

    // When a postback is called, we'll send a message back to the sender to
    // let them know it was successful
    sendTextMessage(senderID, "Postback called");
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
                    elements: [
                        {
                            title: "PowHunt",
                            subtitle: "Welcome! Do you wanna Drive or Ride?",
                            item_url: "https://www.nfl.com",
                            image_url: "http://i.imgur.com/K1WNRhX.jpg",
                            buttons: [
                                {
                                    type: "postback",
                                    title: "Drive",
                                    payload: "Ride Offered"
                                }, {
                                    type: "postback",
                                    title: "Ride",
                                    payload: "Ride Requested"
                                }
                            ]
                        }
                    ]
                }
            }
        }
    };
    callSendAPI(messageData);
}
function parseConditions(gatheredInfoString) {
    var conditionsArray = gatheredInfoString.split(',');
    var parsedObject = {};
    for (var i = 0; i < conditionsArray.length; i++ ) {
        var conditionPair = conditionsArray[i].split(':')
        parsedObject[conditionPair[0]] = conditionPair[1];
    }
    return parsedObject;
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
        qs: {
            access_token: token
        },
        method: 'POST',
        json: messageData

    }, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            var recipientId = body.recipient_id;
            var messageId = body.message_id;

            if (messageId) {
                console.log("Successfully sent message with id %s to recipient %s", messageId, recipientId);
            } else {
                console.log("Successfully called Send API for recipient %s", recipientId);
            }
        } else {
            console.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
        }
    });
}

function findFBProfile(sender) {
    var user;
    request('https://graph.facebook.com/v2.6/' + sender + '?fields=first_name,last_name,profile_pic,locale,timezone,gender&access_token=' + token, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            user = JSON.parse(body);
            console.log('Found profile of: ' + user["first_name"]);
        } else {
            console.log("Could not locate %s's Facebook Profile", senderID);
        }
    });
    return user;
};

function receivedDeliveryConfirmation(event) {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var delivery = event.delivery;
    var messageIDs = delivery.mids;
    var watermark = delivery.watermark;
    var sequenceNumber = delivery.seq;

    if (messageIDs) {
        messageIDs.forEach(function(messageID) {
            console.log("Received delivery confirmation for message ID: %s", messageID);
        });
    }

    console.log("All message before %d were delivered.", watermark);
}
function receivedMessageRead(event) {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;

    // All messages before watermark (a timestamp) or sequence have been seen.
    var watermark = event.read.watermark;
    var sequenceNumber = event.read.seq;

    console.log("Received message read event for watermark %d and sequence " +
        "number %d",
    watermark, sequenceNumber);
}
function receivedAccountLink(event) {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;

    var status = event.account_linking.status;
    var authCode = event.account_linking.authorization_code;

    console.log("Received account link event with for user %d with status %s " +
        "and auth code %s ",
    senderID, status, authCode);
}
function receivedAuthentication(event) {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var timeOfAuth = event.timestamp;

    // The 'ref' field is set in the 'Send to Messenger' plugin, in the 'data-ref'
    // The developer can set this to an arbitrary value to associate the
    // authentication callback with the 'Send to Messenger' click event. This is
    // a way to do account linking when the user clicks the 'Send to Messenger'
    // plugin.
    var passThroughParam = event.optin.ref;

    console.log("Received authentication for user %d and page %d with pass " +
        "through param '%s' at %d",
    senderID, recipientID, passThroughParam, timeOfAuth);

    // When an authentication is received, we'll send a message back to the sender
    // to let them know it was successful.
    sendTextMessage(senderID, "Authentication successful");
}
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
