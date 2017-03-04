'use strict'

const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const config = require('./config');
const pg = require('pg');
const dateFormat = require('dateformat');
const moment = require('moment-timezone');
const app = express();
const token = process.env.FB_PAGE_ACCESS_TOKEN;
const db = process.env.DATABASE_URL;

// Check if postgreSQL is running...
app.set('port', (process.env.PORT || 5000))

// Process application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}))

// Process application/json
app.use(bodyParser.json())

// Index route
app.get('/', function(req, res) {
    res.send('Hello world, I am a chat bot')
})

pg.defaults.ssl = true;
// See tables driver and rider with /db/whichever
app.get('/db/driver', function (request, response) {
  pg.connect(process.env.DATABASE_URL, function(err, client, done) {
    client.query('SELECT * FROM driver', function(err, result) {
      done();
      if (err)
       { console.error(err); response.send("Error " + err);
         response}
      else
       {
         console.log("loaded db results");
         response.json(result.rows); }
    });
  });
});
app.get('/db/rider', function (request, response) {
  pg.connect(process.env.DATABASE_URL, function(err, client, done) {
    client.query('SELECT * FROM rider', function(err, result) {
      done();
      if (err)
       { console.error(err); response.send("Error " + err);
         respon}
      else
       {
         console.log("loaded db results");
         response.json(result.rows); }
    });
  });
});

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

        if (quickReplyPayload.includes('check_rides')) {
          sendTextMessage(senderId, "Checking Rides");
          return
        }

        if (quickReplyPayload.includes('confirmation')) {
          if (quickReplyPayload.includes('true')){
            sendTextMessage(senderId, "Chee, lets get you to the slopes!");
            findFBProfile(senderId, quickReplyPayload);
            return
          } else if (quickReplyPayload.includes('false')) {
            sendTextMessage(senderId, "Humm... lets fix it then");
            return
          }
        }


        if (!quickReplyPayload.includes('drive_or_ride')) {
          askDriveOrRide(senderId, quickReplyPayload);
          return
        }
        if (!quickReplyPayload.includes('departure_location')) {
          askDepartureLocation(senderId, quickReplyPayload);
          return
        };

        if (quickReplyPayload.includes('UBC') && !quickReplyPayload.includes('day_trip')) {
          askDayTrip(senderId, quickReplyPayload);
          return
        };

        if (!quickReplyPayload.includes('departure_date')) {
          askDepartureDate(senderId, quickReplyPayload);
          return
        };

        if (!quickReplyPayload.includes('departure_time')) {
          if (quickReplyPayload.includes('day_trip:false') || quickReplyPayload.includes('Whistler')) {
            askDepartureTime(senderId, quickReplyPayload);
            return
          };
        };

        if (quickReplyPayload.includes('looking_for_riders')) {
          if (!quickReplyPayload.includes('seating_space')) {
            askAvailableSeats(senderId, quickReplyPayload)
            return
          }
          if (!quickReplyPayload.includes('asking_price')) {
            askAskingPrice(senderId, quickReplyPayload)
            return
          }
        };

        if (quickReplyPayload.includes('drive_or_ride') && quickReplyPayload.includes('departure_location') && quickReplyPayload.includes('departure_date')) {
          confirmQueryInfo(senderId, quickReplyPayload);
          return
        }

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
            // case 'query':
            //     queryExample(senderId);
            //     break;
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
function askWhichVariableToChange(recipientId, othervariables) {
  var messageData = {
      recipient: {
          id: recipientId
      },
      message: {
          text: "What do you wanna fix",
          quick_replies: [
              {
                  "content_type": "text",
                  "title": "Date",
                  "payload": "departure_date"
              }, {
                  "content_type": "text",
                  "title": "Time",
                  "payload": "departure_time"
              }, {
                  "content_type": "text",
                  "title": "Location",
                  "payload": "departure_location"
              }
          ]
      }
  };
  callSendAPI(messageData);
}
function askDriveOrRide(recipientId) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            text: "Aloha, are you driving or looking for a ride? 🎿",
            quick_replies: [
                {
                    "content_type": "text",
                    "title": "Driving",
                    "payload": "drive_or_ride:looking_for_riders,"
                }, {
                    "content_type": "text",
                    "title": "Riding",
                    "payload": "drive_or_ride:looking_for_drivers,"
                }, {
                    "content_type": "text",
                    "title": "Check my rides",
                    "payload": "check_rides"
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
            text: "Where do you want a ride from?",
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

function askDayTrip(recipientId, othervariables) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            text: "Day trip or one way?",
            quick_replies: [
                {
                    "content_type": "text",
                    "title": "Daytrip",
                    "payload": othervariables+"day_trip:true,"
                }, {
                    "content_type": "text",
                    "title": "One way",
                    "payload": othervariables+"day_trip:false,"
                }
            ]
        }
    };
    callSendAPI(messageData);
}

function askDepartureDate(recipientId, othervariables) {
    var today = new Date();
    var tomorrow = today.tomorrow();
    var dayAfterTomorrow = tomorrow.tomorrow();

    today = today.tz('America/Vancouver');
    tomorrow = tomorrow.tz('America/Vancouver');
    dayAfterTomorrow = dayAfterTomorrow.tz('America/Vancouver');

    today = dateFormat(today, "ddd, mmm. dS");
    tomorrow = dateFormat(tomorrow, "ddd, mmm. dS");
    dayAfterTomorrow = dateFormat(dayAfterTomorrow, "ddd, mmm. dS");

    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            text: "When do you wanna leave?",
            quick_replies: [
                {
                    "content_type": "text",
                    "title": today,
                    "payload": othervariables+"departure_date:today,"
                }, {
                    "content_type": "text",
                    "title": tomorrow,
                    "payload": othervariables+"departure_date:tomorrow,"
                }, {
                    "content_type": "text",
                    "title": dayAfterTomorrow,
                    "payload": othervariables+"departure_date:dayAfterTomorrow,"
                }
            ]
        }
    };
    callSendAPI(messageData);
};

function askDepartureTime(recipientId, othervariables) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            text: "What 🕗 do you want to go?",
            quick_replies: [
                {
                    "content_type": "text",
                    "title": "🌅 Morning",
                    "payload": othervariables+"departure_time:Morning,"
                }, {
                    "content_type": "text",
                    "title": "🌇 Evening",
                    "payload": othervariables+"departure_time:Evening,"
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
            text: "How much 💰 are you charging per head?",
            quick_replies: [
              {
                "content_type": "text",
                "title": "😍 Free!",
                "payload": othervariables+"asking_price:0,"
            },
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
            text: "How many 🍑s can you fit?",
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
function parseConditions(gatheredInfoString) {
    var conditionsArray = gatheredInfoString.split(',');
    var parsedObject = {};
    for (var i = 0; i < conditionsArray.length; i++ ) {
        var conditionPair = conditionsArray[i].split(':')
        parsedObject[conditionPair[0]] = conditionPair[1];
    }
    return parsedObject;
}
function confirmQueryInfo(recipientId, othervariables) {
  var parsedObject = parseConditions(othervariables);
  console.log("parsed othervariables are ... " + parsedObject);
  var drive_or_ride = parsedObject.drive_or_ride;
  var departure_location = parsedObject.departure_location;
  var departure_date = parsedObject.departure_date;
  var departure_time = parsedObject.departure_time;
  var messageData = {
      recipient: {
          id: recipientId
      },
      message: {
          text: "Alright, let's confirm your inquiry. You are " + drive_or_ride + " from " + departure_location + " " + departure_date + " at around "+ departure_time+"?",
          quick_replies: [
              {
                  "content_type": "text",
                  "title": "Yessir!",
                  "payload": othervariables+"confirmation:true"
              }, {
                  "content_type": "text",
                  "title": "Uhh no...",
                  "payload": othervariables+"confirmation:false"
              }
          ]
        }
  };
  callSendAPI(messageData);
}
function findFBProfile(sender, conditions) {
    request('https://graph.facebook.com/v2.6/' + sender + '?fields=first_name,last_name,profile_pic,locale,timezone,gender&access_token=' + token, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            conditions = parseConditions(conditions);
            var userProfile = JSON.parse(body);
            saveAndQuery(sender, conditions, userProfile);
        } else {
            console.log("Could not locate SenderId: %s's Facebook Profile", senderId);
        }
    });
};

function saveAndQuery(sender, conditions, userProfile) {
    console.log("Starting saveAndQuery");
    var results = [];
    var user = Object.assign(conditions, userProfile);

    if (user.drive_or_ride == "looking_for_riders") {
        pg.connect(process.env.DATABASE_URL, function(err, client, done) {
          client.query('INSERT INTO driver (sender_id, first_name, last_name, profile_pic, gender, seating_space, asking_price, departure_location, departure_date, departure_time, day_trip) values($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)', [sender, user.first_name, user.last_name, user.profile_pic, user.gender, user.seating_space, user.asking_price, user.departure_location, user.departure_date, user.departure_time, user.day_trip]);
          if (user.day_trip == "true") {
            var potentialRiders = client.query("SELECT * FROM rider WHERE day_trip = true AND departure_date = '"+user.departure_date+"' AND departure_location = '"+ user.departure_location+ "' LIMIT 10");
          } else {
            var potentialRiders = client.query("SELECT * FROM rider WHERE departure_time = '"+user.departure_time+"' AND departure_date = '"+user.departure_date+"' AND departure_location = '"+ user.departure_location+ "' LIMIT 10");
          }
          potentialRiders.on('row', (row) => {
            results.push(row);
          });
          potentialRiders.on('end', () => {
            done();
            console.log(results.length);
            if (results.length > 0) {
              sendTextMessage(sender, "Let's get these peeps up!");
              pushQueryResults(sender, results);
              return
            } else {
              sendTextMessage(sender, "Couldn't find riders 😭");
              return
            };
          });
        });
    } else if (user.drive_or_ride == 'looking_for_drivers') {
      pg.connect(process.env.DATABASE_URL, function(err, client, done) {
        client.query('INSERT INTO rider (sender_id, first_name, last_name, profile_pic, gender, departure_location, departure_date, departure_time, day_trip) values($1, $2, $3, $4, $5, $6, $7, $8)', [sender, user.first_name, user.last_name, user.profile_pic, user.gender, user.departure_location, user.departure_date, user.departure_time, user.day_trip]);
        var potentialDriver = client.query("SELECT * FROM driver WHERE departure_time = '"+user.departure_time+"' AND departure_date = '"+user.departure_date+"' AND departure_location = '"+ user.departure_location+ "' ORDER BY asking_price LIMIT 10");
        if (user.day_trip == "true") {
          var potentialDriver = client.query("SELECT * FROM driver WHERE day_trip = true AND departure_date = '"+user.departure_date+"' AND departure_location = '"+ user.departure_location+ "'  ORDER BY asking_price LIMIT 10");
        } else {
          var potentialDriver = client.query("SELECT * FROM driver WHERE departure_time = '"+user.departure_time+"' AND departure_date = '"+user.departure_date+"' AND departure_location = '"+ user.departure_location+ "' ORDER BY asking_price LIMIT 10");
        }
        potentialDriver.on('row', (row) => {
          results.push(row);
        });
        potentialDriver.on('end', () => {
          done();
          console.log(results.length);
          if (results.length > 0) {
            sendTextMessage(sender, "Here are potential drivers");
            pushQueryResults(sender, results);
            return
          } else {
            sendTextMessage(sender, "Couldn't find riders 😭");
            return
          };
        });
       });
    }
};

function pushQueryResults(senderId, queryresults) {

  var elements = [];
  for (var i = 0; i < queryresults.length; i++) {
    var genericObject = {
      title: queryresults[i].first_name+" "+queryresults[i].last_name,
      subtitle: "Asking $"+queryresults[i].asking_price,
      item_url: "https://www.nfl.com",
      image_url: queryresults[i].profile_pic,
      buttons: [{
        type: "postback",
        title: "Start chatting "+queryresults[i].first_name,
        payload: "sup you faka"
      }]
    };
    elements.push(genericObject);
  }
  console.log(elements);

  var messageData = {
    recipient: {
      id: senderId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: elements
        }
      }
    }
  };
  console.log(messageData)
  callSendAPI(messageData);
  return
};

function receivedDeliveryConfirmation(event) {
    var senderId = event.sender.id;
    var recipientId = event.recipient.id;
    var delivery = event.delivery;
    var messageIDs = delivery.mids;
    var watermark = delivery.watermark;
    var sequenceNumber = delivery.seq;

    if (messageIDs) {
        messageIDs.forEach(function(messageID) {
            // console.log("Received delivery confirmation for message ID: %s", messageID);
        });
    }

    // console.log("All message before %d were delivered.", watermark);
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
            // var recipientId = body.recipient_id;
            // var messageId = body.message_id;
            //
            // if (messageId) {
            //     console.log("Successfully sent message with id %s to recipient %s", messageId, recipientId);
            // } else {
            //     console.log("Successfully called Send API for recipient %s", recipientId);
            // }
        } else {
            console.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
        }
    });
}
