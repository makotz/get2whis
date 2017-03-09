'use strict'

const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const pg = require('pg');
const dateFormat = require('dateformat');
const moment = require('moment-timezone');
const pq = require('./parameterQueries');
const app = express();
const token = process.env.FB_PAGE_ACCESS_TOKEN;
const db = process.env.DATABASE_URL;

// Check if postgreSQL is running...
app.set('port', (process.env.PORT || 5000))

// Process application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}))

// Process application/json
app.use(bodyParser.json());

// Index route
app.get('/', function(req, res) {
    res.send('Hello world, I am a chat bot')
})

pg.defaults.ssl = true;
// See tables driver and rider with /db/whichever
// app.get('/db/driver', function (request, response) {
//   displayData('driver', request, response);
// });
// app.get('/db/rider', function (request, response) {
//   displayData('rider', request, response);
// });
//
// function displayData(db) {
//   pg.connect(process.env.DATABASE_URL, function(err, client, done) {
//     client.query('SELECT * FROM '+db, function(err, result) {
//       done();
//       if (err)
//        { console.error(err); response.send("Error " + err);
//          response}
//       else
//        {
//          console.log("loaded db results");
//          response.json(result.rows); }
//     });
//   });
// }
// for Facebook verification
app.get('/webhook/', function(req, res) {
    if (req.query['hub.verify_token'] === 'my_voice_is_my_password_verify_me') {
        res.send(req.query['hub.challenge'])
    }
    res.send('Error, wrong token')
})
// Spin up the server
app.listen(app.get('port'), function() {
    console.log('running on port', app.get('port'));
});

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

        if (quickReplyPayload.includes('start_over')) {
          askDriveOrRide(senderId);
          return
        }

        if (quickReplyPayload.includes('check_rides')) {
          if (quickReplyPayload.includes('checkUserDriveOrRide:drive')) {
            checkUserRideInfo(senderId, 'drive');
            return
          } else if (quickReplyPayload.includes('checkUserDriveOrRide:ride')) {
            checkUserRideInfo(senderId, 'ride');
            return
          } else {
            checkUserDriveOrRide(senderId, quickReplyPayload);
            return
          };
        };

        if (quickReplyPayload.includes('confirmation')) {
          if (quickReplyPayload.includes('confirmation:true')){
            findFBProfile(senderId, quickReplyPayload);
            return
          } else if (quickReplyPayload.includes('confirmation:false')) {
            sendTextMessage(senderId, "Okay let's try again!", askDriveOrRide(senderId));
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
            case 'Ski':
            case 'ski':
            case 'Board':
            case 'board':
            askDriveOrRide(senderId);
            break;
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
            default:
                sendTextMessage(senderId, 'Hi there, type "ski" or "board" to begin');
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
            text: "Where are you leaving from?",
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
    var today = moment().format().tz('America/Vancouver');
    var tomorrow = moment().format().tz('America/Vancouver').add(1, 'days');
    var dayAfterTomorrow = moment().format().tz('America/Vancouver').add(2, 'days');
    console.log('today is'+today);


    var todayButton = dateFormat(today, "ddd, mmm. dS");
    var tomorrowButton = dateFormat(tomorrow, "ddd, mmm. dS");
    var dayAfterTomorrowButton = dateFormat(dayAfterTomorrow, "ddd, mmm. dS");
    console.log('today button is'+todayButton);

    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            text: "What day are you riding?",
            quick_replies: [
                {
                    "content_type": "text",
                    "title": todayButton,
                    "payload": othervariables+"departure_date:today,"
                }, {
                    "content_type": "text",
                    "title": tomorrowButton,
                    "payload": othervariables+"departure_date:tomorrow,"
                }, {
                    "content_type": "text",
                    "title": dayAfterTomorrowButton,
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
function checkUserDriveOrRide(recipientId, othervariables) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            text: "Do you wanna check your drive offered or rides asked?",
            quick_replies: [
                {
                    "content_type": "text",
                    "title": "Drive offered",
                    "payload": othervariables+"checkUserDriveOrRide:drive,"
                }, {
                    "content_type": "text",
                    "title": "Rides asked",
                    "payload": othervariables+"checkUserDriveOrRide:ride,"
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
function checkUserRideInfo(sender, driveOrRide) {
  var results = [];

  pg.connect(process.env.DATABASE_URL, function(err, client, done) {
    var userQuery = client.query("SELECT * FROM "+ driveOrRide +"r WHERE sender_id = '"+sender+"' LIMIT 10");
    var user = 'checkingStatus'+driveOrRide
    userQuery.on('row', (row) => {
      results.push(row);
    });
    userQuery.on('end', () => {
      done();
      if (results.length > 0) {
        sendTextMessage(sender, "Here are your offers/asks:", pushQueryResults(sender, results, user));
        startOver(sender);
        return
      } else {
        sendTextMessage(sender, "Looks like you haven't made one yet!", startOver(sender));
        return
      };
    });

  });
}
function receivedPostback(event) {
    var senderId = event.sender.id;
    var recipientId = event.recipient.id;
    var timeOfPostback = event.timestamp;
    var payload = event.postback.payload;
    console.log("Received postback for user %d and page %d with payload '%s' " + "at %d",  senderId, recipientId, payload, timeOfPostback);

    if (payload.includes('DELETE')) {
      DeleteRecord(payload, sendTextMessage(senderId, "Deleted relevant record"));
    } else {
      var match1 = JSON.parse(payload).match;
      sendTextMessage(match1, "Hey, someone pinged you!", notificationGenericTemplate(match1, payload));
    }
}

function sendTextMessage(recipientId, messageText, callback) {

    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            text: messageText,
            metadata: "DEVELOPER_DEFINED_METADATA"
        }
    };
    if (callback) {
    callSendAPI(messageData, callback());
    } else {
    callSendAPI(messageData);
    }
}

function parseConditions(gatheredInfoString, callback) {
    var conditionsArray = gatheredInfoString.split(',');
    var parsedObject = {};
    for (var i = 0; i < conditionsArray.length; i++ ) {
        var conditionPair = conditionsArray[i].split(':')
        parsedObject[conditionPair[0]] = conditionPair[1];
    }
    if (callback) {callback()};
    return parsedObject;
}
function confirmQueryInfo(recipientId, othervariables) {
  var parsedObject = parseConditions(othervariables);
  if (parsedObject.drive_or_ride == 'looking_for_riders') {
    var drive_or_ride = "looking for riders";
  } else if (parsedObject.drive_or_ride == 'looking_for_drivers') {
    var drive_or_ride = "looking for a driver";
  }
  var departure_location = parsedObject.departure_location;
  var departure_date = parsedObject.departure_date;
  var finalCondition = " at around "+parsedObject.departure_time;
  if (parsedObject.departure_time == 'undefined') {finalCondition = " (roundtrip)";}
  var messageData = {
      recipient: {
          id: recipientId
      },
      message: {
          text: "Alright, let's confirm your search. You are " + drive_or_ride + " from " + departure_location + " " + departure_date + finalCondition+"?",
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
    var results = [];
    var user = Object.assign(conditions, userProfile);

    if (user.drive_or_ride == "looking_for_riders") {
        pg.connect(process.env.DATABASE_URL, function(err, client, done) {
          client.query('INSERT INTO driver (sender_id, first_name, last_name, profile_pic, gender, seating_space, asking_price, departure_location, departure_date, departure_time, day_trip) values($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)', [sender, user.first_name, user.last_name, user.profile_pic, user.gender, user.seating_space, user.asking_price, user.departure_location, user.departure_date, user.departure_time, user.day_trip]);
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
              sendTextMessage(sender, "Let's get these peeps up!", pushQueryResults(sender, results, user));
              return
            } else {
              sendTextMessage(sender, "Couldn't find riders 😭", startOver(sender));
              return
            };
          });
        });
    } else if (user.drive_or_ride == 'looking_for_drivers') {
      pg.connect(process.env.DATABASE_URL, function(err, client, done) {
        client.query('INSERT INTO rider (sender_id, first_name, last_name, profile_pic, gender, departure_location, departure_date, departure_time, day_trip) values($1, $2, $3, $4, $5, $6, $7, $8, $9)', [sender, user.first_name, user.last_name, user.profile_pic, user.gender, user.departure_location, user.departure_date, user.departure_time, user.day_trip]);
        var potentialDriver = client.query("SELECT * FROM driver WHERE departure_time = '"+user.departure_time+"' AND departure_date = '"+user.departure_date+"' AND departure_location = '"+ user.departure_location+ "' ORDER BY asking_price LIMIT 10");
        if (user.day_trip == "true") {
          var potentialDriver = client.query("SELECT * FROM driver WHERE day_trip = true AND departure_date = '"+user.departure_date+"' AND departure_location = '"+ user.departure_location+ "' ORDER BY asking_price LIMIT 10");
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
            sendTextMessage(sender, "Here are potential drivers:", pushQueryResults(sender, results, user));
            return
          } else {
            sendTextMessage(sender, "Couldn't find a driver 😭", startOver(sender));
            return
          };
        });
       });
    }
};
function pushQueryResults(senderId, queryresults, user, callback) {

  var elements = [];
  for (var i = 0; i < queryresults.length; i++) {
    var payload = "sup";

    if (user.profile_pic) {
      user.match = queryresults[i].sender_id;
      payload = JSON.stringify(user);
    };

    var genericObject = {
      title: queryresults[i].first_name+" "+queryresults[i].last_name,
      subtitle: "Asking $"+queryresults[i].asking_price+ " for ride on "+queryresults[i].departure_date,
      item_url: 'https://www.facebook.com/search/people/?q='+queryresults[i].first_name+'%20'+queryresults[i].last_name,
      image_url: queryresults[i].profile_pic,
      buttons: [{
        type: "web_url",
        title: "🔍 & chat with "+queryresults[i].first_name,
        url: 'https://www.facebook.com/search/people/?q='+queryresults[i].first_name+'%20'+queryresults[i].last_name
      }, {
        type: "postback",
        title: "Ping " + queryresults[i].first_name,
        payload: payload,
      }]
    };

    if (!queryresults[i].asking_price) {
      if (queryresults[i].day_trip == true) {
        genericObject.subtitle = "Looking for a ride for a daytrip on "+queryresults[i].departure_date
      } else {
        genericObject.subtitle = "Looking for a one way ride on "+queryresults[i].departure_date+" in the "+queryresults[i].departure_time+" from "+queryresults[i].departure_location
      }
     };
    if (!user) { genericObject.buttons.pop() };
    if (user == "checkingStatusdrive") {
      genericObject.buttons.pop();
      genericObject.buttons.pop();
      var addButton = {
        type: "postback",
        title: "Trash post",
        payload: 'DELETE_DRIVER:'+queryresults[i].id,
      };
      genericObject.buttons.push(addButton);
    } else if (user == "checkingStatusride") {
      genericObject.buttons.pop()
      var addButton = {
        type: "postback",
        title: "Trash post",
        payload: 'DELETE_RIDER:'+queryresults[i].id,
      };
      genericObject.buttons.push(addButton);
    }
    elements.push(genericObject);
  }

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
  callSendAPI(messageData);
  if(callback){callback()};
  return
};

function notificationGenericTemplate(senderId, user) {

    var user1 = JSON.parse(user);
    var genericObject = [{
      title: user1.first_name+" "+user1.last_name,
      subtitle: "Offering a one way ride "+user1.departure_date+" from "+user1.departure_location,
      item_url: 'https://www.facebook.com/search/people/?q='+user1.first_name+'%20'+user1.last_name,
      image_url: user1.profile_pic,
      buttons: [{
        type: "web_url",
        title: "🔍 & chat with "+user1.first_name,
        url: 'https://www.facebook.com/search/people/?q='+user1.first_name+'%20'+user1.last_name
      }]
    }];

    if (user1.asking_price) { genericObject[0].subtitle = "Asking for your ride "+user1.departure_date+" from "+user1.departure_location };

  var messageData = {
    recipient: {
      id: senderId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: genericObject
        }
      }
    }
  };

  callSendAPI(messageData);
  return
};
function startOver(recipientId) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            text: "Push buton to start over",
            quick_replies: [
                {
                    "content_type": "text",
                    "title": "Restart",
                    "payload": "start_over"
                }
            ]
        }
    };
    callSendAPI(messageData);
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
function callSendAPI(messageData, callback) {
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
    if (callback) {callback()};
}

function DeleteRecord(payload, callback) {
  var parsedObject = parseConditions(payload);
  if (parsedObject.DELETE_RIDER) {var driver_or_rider = "rider"; var id = parsedObject.DELETE_RIDER} else {var driver_or_rider = "driver";  var id = parsedObject.DELETE_DRIVER};
  pg.connect(process.env.DATABASE_URL, function(err, client, done) {
    client.query("DELETE FROM '"+driver_or_rider+"'"+" WHERE id = "+id);
    console.log(driver_or_rider+ " with id "+ id + " was deleted.")
      done();
    });
    if (callback) {callback()};
}
