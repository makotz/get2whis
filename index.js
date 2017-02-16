'use strict'

const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const config = require('./config');
const mongoose = require('mongoose');
const User = require('./models/user');
const app = express();
const token = process.env.FB_PAGE_ACCESS_TOKEN;
// Check if mongoose is running
mongoose.connect(config.database, function(err) {
    if (err) {
        console.log(err);
    } else {
        console.log("Mongoose is running");
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
    var senderId = event.sender.id;
    var recipientId = event.recipient.id;
    var timeOfMessage = event.timestamp;
    var message = event.message;

    console.log("Received message for user %d and page %d at %d with message:", senderId, recipientId, timeOfMessage);
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

        if (quickReplyPayload.includes('confirmation')) {
          sendTextMessage(senderId, "Alrighty!");
          findFBProfile(senderId, JSON.parse(quickReplyPayload), saveUser);
          return
        }

        if (quickReplyPayload.includes('looking_for_riders')) {
          if (!quickReplyPayload.includes('asking_price')) {
            askAskingPrice(senderId, quickReplyPayload)
            return
          }
          if (!quickReplyPayload.includes('seating_space')) {
            askAvailableSeats(senderId, quickReplyPayload)
            return
          }
          return
        }

        if (quickReplyPayload.includes('drive_or_ride') && quickReplyPayload.includes('departure_location') && quickReplyPayload.includes('departure_time') && quickReplyPayload.includes('departure_date')) {
          var parsedObject = parseConditions(quickReplyPayload);
          confirmQueryInfo(senderId, parsedObject);
          return
        }

        ifElse(senderId, quickReplyPayload, 'drive_or_ride', askDriveOrRide);
        return
        ifElse(senderId, quickReplyPayload, 'departure_location', askDepartureLocation);
        return
        ifElse(senderId, quickReplyPayload, 'departure_date', askDepartureDate);
        return
        ifElse(senderId, quickReplyPayload, 'departure_time', askDepartureTime);
        return

        sendTextMessage(senderId, "Quick reply tapped");
        return;
    }

    if (messageText) {
        // If we receive a text message, check to see if it matches any special
        // keywords and send back the corresponding example. Otherwise, just echo
        // the text we received.
        switch (messageText) {
            // case 'topsecret':
            //     sendDriveOrRide(senderId);
            //     break;

            case 'aloha':
                askDriveOrRide(senderId);
                break;
            case 'query':
                queryExample(senderId);
                break;
            case 'will you be my valentine?':
                sendTextMessage(senderId, "Negative");
            break;
            case 'please':
                sendTextMessage(senderId, "Brah no");
            break;
                //
                //       case 'button':
                //         sendButtonMessage(senderId);
                //         break;
                //
                //       case 'generic':
                //         sendGenericMessage(senderId);
                //         break;
                //
                //       case 'receipt':
                //         sendReceiptMessage(senderId);
                //         break;
                //
                //       case 'quick reply':
                //         sendQuickReply(senderId);
                //         break;
                //
                //       case 'read receipt':
                //         sendReadReceipt(senderId);
                //         break;
                //
                //       case 'typing on':
                //         sendTypingOn(senderId);
                //         break;
                //
                //       case 'typing off':
                //         sendTypingOff(senderId);
                //         break;
                //
                //       case 'account linking':
                //         sendAccountLinking(senderId);
                //         break;

            default:
                sendTextMessage(senderId, 'Hi there, type "aloha" to begin');
        }
    } else if (messageAttachments) {
        sendTextMessage(senderId, "Message with attachment received");
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
            text: "Cool, when do you wanna leave?",
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
                    "payload": othervariables+"departure_time:Early_morning,"
                }, {
                    "content_type": "text",
                    "title": "Evening",
                    "payload": othervariables+"departure_time:Evening,"
                }, {
                    "content_type": "text",
                    "title": "Late Night",
                    "payload": othervariables+"departure_time:Late_night,"
                }
            ]
        }
    };
    callSendAPI(messageData);
}
function askAskingPrice(recipientId, othervariables) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            text: "How much are you charging per head?",
            quick_replies: [
                {
                    "content_type": "text",
                    "title": "5",
                    "payload": othervariables+"asking_price:5,"
                }, {
                    "content_type": "text",
                    "title": "10",
                    "payload": othervariables+"asking_price:10,"
                }, {
                    "content_type": "text",
                    "title": "15",
                    "payload": othervariables+"asking_price:15,"
                }
            ]
        }
    };
    callSendAPI(messageData);
}
function askAvailableSeats(recipientId, othervariables) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            text: "How many butts can you fit?",
            quick_replies: [
                {
                    "content_type": "text",
                    "title": "1",
                    "payload": othervariables+"seating_space:1,"
                }, {
                    "content_type": "text",
                    "title": "2",
                    "payload": othervariables+"seating_space:2,"
                }, {
                    "content_type": "text",
                    "title": "3",
                    "payload": othervariables+"seating_space:3,"
                }
            ]
        }
    };
    callSendAPI(messageData);
}
function receivedPostback(event) {
    var senderId = event.sender.id;
    var recipientId = event.recipient.id;
    var timeOfPostback = event.timestamp;

    // The 'payload' param is a developer-defined field which is set in a postback
    // button for Structured Messages.
    var payload = event.postback.payload;

    console.log("Received postback for user %d and page %d with payload '%s' " +
        "at %d",
    senderId, recipientId, payload, timeOfPostback);

    // When a postback is called, we'll send a message back to the sender to
    // let them know it was successful
    sendTextMessage(senderId, "Postback called");
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
function confirmQueryInfo(recipientId, parsedObject) {
  console.log("parsedObject is ... " + parsedObject);
  var drive_or_ride = parsedObject.drive_or_ride;
  var departure_location = parsedObject.departure_location;
  var departure_date = parsedObject.departure_date;
  var departure_time = parsedObject.departure_time;
  var confirmedConditions = parsedObject
    confirmedConditions.confirmation = true
  var messageData = {
      recipient: {
          id: recipientId
      },
      message: {
          text: "Alright, let's confirm your inquiry. You are " + drive_or_ride + " from " + departure_location + " " + departure_date + " at around "+ departure_time+"?",
          quick_replies: [
              {
                  "content_type": "text",
                  "title": "Chee",
                  "payload": JSON.stringify(confirmedConditions)
              }, {
                  "content_type": "text",
                  "title": "Nope",
                  "payload": JSON.stringify(parsedObject)
              }
          ]
        }
  };
  callSendAPI(messageData);
}

function ifElse(senderId, quickReplyPayload, keyword, conditionFunction) {
  if (!quickReplyPayload.includes(keyword)) {
    conditionFunction(senderId, quickReplyPayload);
    return
  }
}

function queryExample(recipientId) {
  User.findOne({last_name: "Ejima"}, function(err, user) {
    if(err) {
      console.log("error occured:"+ err);
    } else {
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
                title: user.first_name+" "+user.last_name,
                subtitle: user.ride_info.departure_date,
                item_url: "https://www.nfl.com",
                image_url: user.profile_pic,
                buttons: [{
                  type: "postback",
                  title: "Contact",
                  payload: "sup you faka"
                }]
              }]
            }
          }
        }
      };
      callSendAPI(messageData);
      return
    }
  });
}

function findFBProfile(sender, conditions, saveOrQuery) {
    request('https://graph.facebook.com/v2.6/' + sender + '?fields=first_name,last_name,profile_pic,locale,timezone,gender&access_token=' + token, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            var userProfile = JSON.parse(body);
            saveOrQuery(sender, conditions, userProfile);
        } else {
            console.log("Could not locate SenderId: %s's Facebook Profile", senderId);
        }
    });
};

function saveUser(senderId, conditions, userProfile) {
  console.log("User is ..." + userProfile);

  var newUser = new User({
    sender: senderId,
    first_name: userProfile["first_name"],
    last_name: userProfile["last_name"],
    profile_pic: userProfile["profile_pic"],
    gender: userProfile["gender"],
    ride_info: conditions
  });
  newUser.save(function(err) {
    if(err) {
      console.log(err);
    } else {
      console.log("User created!");
    }
  })
}



function receivedDeliveryConfirmation(event) {
    var senderId = event.sender.id;
    var recipientId = event.recipient.id;
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
    var senderId = event.sender.id;
    var recipientId = event.recipient.id;

    // All messages before watermark (a timestamp) or sequence have been seen.
    var watermark = event.read.watermark;
    var sequenceNumber = event.read.seq;

    console.log("Received message read event for watermark %d and sequence " +
        "number %d",
    watermark, sequenceNumber);
}
function receivedAccountLink(event) {
    var senderId = event.sender.id;
    var recipientId = event.recipient.id;

    var status = event.account_linking.status;
    var authCode = event.account_linking.authorization_code;

    console.log("Received account link event with for user %d with status %s " +
        "and auth code %s ",
    senderId, status, authCode);
}
function receivedAuthentication(event) {
    var senderId = event.sender.id;
    var recipientId = event.recipient.id;
    var timeOfAuth = event.timestamp;

    // The 'ref' field is set in the 'Send to Messenger' plugin, in the 'data-ref'
    // The developer can set this to an arbitrary value to associate the
    // authentication callback with the 'Send to Messenger' click event. This is
    // a way to do account linking when the user clicks the 'Send to Messenger'
    // plugin.
    var passThroughParam = event.optin.ref;

    console.log("Received authentication for user %d and page %d with pass " +
        "through param '%s' at %d",
    senderId, recipientId, passThroughParam, timeOfAuth);

    // When an authentication is received, we'll send a message back to the sender
    // to let them know it was successful.
    sendTextMessage(senderId, "Authentication successful");
}
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
