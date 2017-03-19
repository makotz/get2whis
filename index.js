'use strict'

const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const pg = require('pg');
const moment = require('moment-timezone');
const obj = require('./objects.js');
const async = require('async');
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
app.get('/db/driver', function(request, response) {
    displayData('driver', request, response);
});
app.get('/db/rider', function(request, response) {
    displayData('rider', request, response);
});

function displayData(dbsource, request, response) {
    pg.connect(db, function(err, client, done) {
        client.query('SELECT * FROM ' + dbsource, function(err, result) {
            done();
            if (err) {
                console.error(err);
                response.send("Error " + err);
                return response
            } else {
                console.log("loaded: " + dbsource + " results");
                return response.json(result.rows);
            }
        });
    });
};
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
                if (messagingEvent.message) {
                    receivedMessage(messagingEvent);
                } else if (messagingEvent.postback) {
                    receivedPostback(messagingEvent);
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
        // console.log("Received echo for message %s and app %d with metadata %s", messageId, appId, metadata);
        return;
    } else if (quickReply) {
        var quickReplyPayload = quickReply.payload;
        console.log("Quick reply for message %s with payload %s", messageId, quickReplyPayload);

        if (quickReplyPayload.includes('start')) {
            askDriveOrRide(senderId);
            return
        }

        if (quickReplyPayload.includes('check_rides')) {
            if (quickReplyPayload.includes('checkUserDriveOrRide')) {
                var driveOrRide = parseConditions(quickReplyPayload);
                checkUserRideInfo(senderId, driveOrRide.checkUserDriveOrRide);
                return
            } else {
                checkUserDriveOrRide(senderId, quickReplyPayload);
                return
            };
        };

        if (quickReplyPayload.includes('confirmation')) {
            if (quickReplyPayload.includes('confirmation:true')) {
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

        if (quickReplyPayload.includes('looking_for_riders') && !quickReplyPayload.includes('asking_price')) {
            askAskingPrice(senderId, quickReplyPayload)
            return
        };

        if (quickReplyPayload.includes('drive_or_ride') && quickReplyPayload.includes('departure_location') && quickReplyPayload.includes('departure_date')) {
            confirmQueryInfo(senderId, quickReplyPayload);
            return
        }
    }

    if (messageText || messageAttachments) {
        if (messageText == "test") {} else {
            start(senderId)
        }
    }
}

function askDriveOrRide(recipientId) {
    var Qtext = "Hey there, are you driving or looking for a ride?";
    var quickreplypairs = [
        {
            "Driving": "drive_or_ride:looking_for_riders,"
        }, {
            "Looking for a ride": "drive_or_ride:looking_for_drivers,"
        }, {
            "Check my posts": "check_rides:true,"
        }
    ]
    callSendAPI(obj.createQuickReplyMessageData(recipientId, Qtext, quickreplypairs));
}
function askDepartureLocation(recipientId, othervariables) {
    var Qtext = "Where are you leaving from?";
    var quickreplypairs = [
        {
            "UBC": othervariables + "departure_location:UBC,"
        }, {
            "Whistler": othervariables + "departure_location:Whistler,"
        }
    ];
    callSendAPI(obj.createQuickReplyMessageData(recipientId, Qtext, quickreplypairs));
}
function askDayTrip(recipientId, othervariables) {
    var Qtext = "Day trip or one way?";
    var quickreplypairs = [
        {
            "Daytrip": othervariables + "day_trip:true,"
        }, {
            "One way": othervariables + "day_trip:false,"
        }
    ];
    callSendAPI(obj.createQuickReplyMessageData(recipientId, Qtext, quickreplypairs));
}

function askDepartureDate(recipientId, othervariables) {
    var today = new Date();
    var tomorrow = new Date();
    var dayAfterTomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

    var todayTimeZone = moment.tz(today, 'America/Vancouver');
    var tomorrowTimeZone = moment.tz(tomorrow, 'America/Vancouver');
    var dayAfterTomorrowTimeZone = moment.tz(dayAfterTomorrow, 'America/Vancouver');

    var todayButton = moment(todayTimeZone).format("ddd. MMM. Do");
    var tomorrowButton = moment(tomorrowTimeZone).format("ddd. MMM. Do");
    var dayAfterTomorrowButton = moment(dayAfterTomorrowTimeZone).format("ddd. MMM. Do");

    var todayPostgres = moment(todayTimeZone).format("YYYY-MM-DD");
    var tomorrowPostgres = moment(tomorrowTimeZone).format("YYYY-MM-DD");
    var dayAfterTomorrowPostgres = moment(dayAfterTomorrowTimeZone).format("YYYY-MM-DD");
    console.log("today posgtres is " + todayPostgres);

    var Qtext = "What day are you riding?";
    var quickreplypairs = [
        {
            [todayButton]: othervariables + "departure_date:" + todayPostgres + ","
        }, {
            [tomorrowButton]: othervariables + "departure_date:" + tomorrowPostgres + ","
        }, {
            [dayAfterTomorrowButton]: othervariables + "departure_date:" + dayAfterTomorrowPostgres + ","
        }
    ];
    callSendAPI(obj.createQuickReplyMessageData(recipientId, Qtext, quickreplypairs));
};

function askDepartureTime(recipientId, othervariables) {
    var Qtext = "What 🕗 do you want to go?";
    var quickreplypairs = [
        {
            "🌅 Morning": othervariables + "departure_time:Morning,"
        }, {
            "🌇 Evening": othervariables + "departure_time:Evening,"
        }
    ];
    callSendAPI(obj.createQuickReplyMessageData(recipientId, Qtext, quickreplypairs));
};

function checkUserDriveOrRide(recipientId, othervariables) {
    var Qtext = "Do you wanna check your ride(s) offered or ride(s) asked?";
    var quickreplypairs = [
        {
            "Ride(s) offered": othervariables + "checkUserDriveOrRide:drive,"
        }, {
            "Ride(s) asked": othervariables + "checkUserDriveOrRide:ride,"
        }
    ];
    callSendAPI(obj.createQuickReplyMessageData(recipientId, Qtext, quickreplypairs));
};

function askAskingPrice(recipientId, othervariables) {
    var Qtext = "How much 💰 are you charging per head?";
    var quickreplypairs = [
        {
            "😍 Free!": othervariables + "asking_price:0,"
        }, {
            "5": othervariables + "asking_price:5,"
        }, {
            "10": othervariables + "asking_price:10,"
        }, {
            "15": othervariables + "asking_price:15,"
        }
    ];
    callSendAPI(obj.createQuickReplyMessageData(recipientId, Qtext, quickreplypairs));
}

function checkUserRideInfo(sender, driveOrRide) {
    var results = [];
    pg.connect(db, function(err, client, done) {
        var userQuery = client.query("SELECT * FROM " + driveOrRide + "r WHERE sender_id = '" + sender + "' LIMIT 10");
        var user = {checkingStatus:driveOrRide};
        userQuery.on('row', (row) => {
            results.push(row);
        });
        userQuery.on('end', () => {
            done();
            if (results.length > 0) {
                async.series([
                  function(callback) {sendTextMessage(sender, "Here are your posts:", callback)},
                  function(callback) {displayQueryResults(sender, results, user, callback)},
                  function(callback) {startOver(sender, callback)}
                ]);
                return
            } else {
              async.series([
                function(callback) {sendTextMessage(sender, "Looks like you haven't made one yet!", callback)},
                function(callback) {startOver(sender,callback)}
              ]);
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
    console.log("Received postback for user %d and page %d with payload '%s' " +
        "at %d",
    senderId, recipientId, payload, timeOfPostback);
    var payloadData = parseConditions(payload);

    if (payloadData.deleteQuery) {
      DeleteRecord2(payloadData.driverOrRiderTable, payloadData.postId);
      sendTextMessage(senderId, "Deleted post!");
    }
    if (payload.includes('Delete_query')) {
        var conditions = parseConditions(payload);
        if (conditions.Driver_id) {
            DeleteRecord2('driver', conditions.Driver_id);
            sendTextMessage(conditions.ping, "Hummm... looks like " + conditions.comeback + " found a 🚗 already");
            sendTextMessage(conditions.senderId, "Okay, I let " + conditions.first_name + " know!");
            startOver(conditions.ping);
        } else {
            DeleteRecord2('rider', conditions.Rider_id);
            sendTextMessage(conditions.ping, "Hummm... looks like " + conditions.comeback + "'s car is full");
            sendTextMessage(conditions.senderId, "Okay, I let " + conditions.first_name + " know!");
            startOver(conditions.ping);
        }
    } else {
        var match1 = JSON.parse(payload).match;
        sendTextMessage(match1, "Hey, a fellow ski bum pinged you!", pingOfferer(match1, payload));
    }
}

function parseConditions(gatheredInfoString, callback) {
    var parsedObject = {};
    var conditionsArray = gatheredInfoString.split(',');
    conditionsArray.forEach(function(i) {
        var conditionPair = i.split(':');
        console.log(conditionPair);
        parsedObject[conditionPair[0]] = conditionPair[1];
    });
    if (callback) {
        callback()
    };
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
    var departure_date = moment(parsedObject.departure_date, "YYYY-MM-DD").format("ddd. MMM. Do");
    if (!parsedObject.departure_time) {
        var finalCondition = " (roundtrip)"
    } else {
        var finalCondition = " in the " + parsedObject.departure_time.toLowerCase()
    };

    var Qtext = "Alright, let's confirm your search. You are " + drive_or_ride + " from " + departure_location + " on " + departure_date + finalCondition + "?";
    var quickreplypairs = [
        {
            "Yessir!": othervariables + "confirmation:true"
        }, {
            "Not quite...": othervariables + "confirmation:false"
        }
    ];
    callSendAPI(obj.createQuickReplyMessageData(recipientId, Qtext, quickreplypairs));
};

function findFBProfile(sender, conditions) {
    request('https://graph.facebook.com/v2.6/' + sender + '?fields=first_name,last_name,profile_pic,locale,timezone,gender&access_token=' + token, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            saveAndQuery(sender, conditions, JSON.parse(body));
        } else {
            console.log("Could not locate SenderId: %s's Facebook Profile :(", senderId);
        }
    });
};

function saveAndQuery(sender, conditions, userProfile) {
    var queryResults = [];
    var conditions = parseConditions(conditions);
    var user = Object.assign(conditions, userProfile);
    console.log("User depart date is " + user.departure_date);

    if (user.drive_or_ride == "looking_for_riders") {
        pg.connect(db, function(err, client, done) {
            client.query('INSERT INTO driver (sender_id, first_name, last_name, profile_pic, gender, asking_price, departure_location, departure_date, departure_time, day_trip) values($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)', [
                sender,
                user.first_name,
                user.last_name,
                user.profile_pic,
                user.gender,
                user.asking_price,
                user.departure_location,
                user.departure_date,
                user.departure_time,
                user.day_trip
            ]);
            if (user.day_trip == "true") {
                console.log("User depart date object type is " + Object.prototype.toString.call(user.departure_date));
                var potentialRiders = client.query("SELECT * FROM rider WHERE sender_id != '" + sender + "' AND day_trip = true AND departure_date = '" + user.departure_date + "' AND departure_location = '" + user.departure_location + "' LIMIT 10");
                console.log("potential riders are" + potentialRiders);
            } else {
                console.log("User depart date is " + user.departure_date);
                var potentialRiders = client.query("SELECT * FROM rider WHERE sender_id != '" + sender + "' AND departure_time = '" + user.departure_time + "' AND departure_date = '" + user.departure_date + "' AND departure_location = '" + user.departure_location + "' LIMIT 10");
                console.log("potential riders are" + potentialRiders)
            }
            potentialRiders.on('row', (row) => {
                queryResults.push(row)
            });
            potentialRiders.on('end', () => {
                done()
                if (queryResults.length > 0) {
                    sendTextMessage(sender, "Let's get these peeps up!", displayQueryResults(sender, queryResults, user));
                    return
                } else {
                    async.series([
                      function(callback) {sendTextMessage(sender, "Couldn't find riders 😭", callback)},
                      function(callback) {startOver(sender,callback)}
                    ]);
                    return
                };
            });
        });
    } else if (user.drive_or_ride == 'looking_for_drivers') {
        pg.connect(db, function(err, client, done) {
            client.query('INSERT INTO rider (sender_id, first_name, last_name, profile_pic, gender, departure_location, departure_date, departure_time, day_trip) values($1, $2, $3, $4, $5, $6, $7, $8, $9)', [
                sender,
                user.first_name,
                user.last_name,
                user.profile_pic,
                user.gender,
                user.departure_location,
                user.departure_date,
                user.departure_time,
                user.day_trip
            ]);
            var potentialDriver = client.query("SELECT * FROM driver WHERE sender_id != '" + sender + "' AND departure_time = '" + user.departure_time + "' AND departure_date = '" + user.departure_date + "' AND departure_location = '" + user.departure_location + "' ORDER BY asking_price LIMIT 10");
            if (user.day_trip == "true") {
                console.log("User depart date is " + user.departure_date);
                var potentialDriver = client.query("SELECT * FROM driver WHERE sender_id != '" + sender + "' AND day_trip = true AND departure_date = '" + user.departure_date + "' AND departure_location = '" + user.departure_location + "' ORDER BY asking_price LIMIT 10");
                console.log("potential driver are" + potentialDriver)
            } else {
                console.log("User depart date is " + user.departure_date);
                var potentialDriver = client.query("SELECT * FROM driver WHERE sender_id != '" + sender + "' AND departure_time = '" + user.departure_time + "' AND departure_date = '" + user.departure_date + "' AND departure_location = '" + user.departure_location + "' ORDER BY asking_price LIMIT 10");
                console.log("potential driver are" + potentialDriver)

            }
            potentialDriver.on('row', (row) => {
                queryResults.push(row)
            });
            potentialDriver.on('end', () => {
                done()
                if (queryResults.length > 0) {
                    async.series([
                      function (callback) {
                      sendTextMessage(sender, "Here are potential driver(s):", callback)
                      },
                      function (callback) {displayQueryResults(sender, queryResults, user, callback)
                      },
                      function (callback) {startOver(sender, callback)}
                      ]);
                    return
                } else {
                  async.series([
                    function (callback){
                    sendTextMessage(sender, "Couldn't find a driver 😭", callback)},
                    function (callback) { startOver(sender, callback)}
                  ]);
                  return
                };
            });
        });
    };
};

function createGenericObjects(queryResults) {
    var genericObjects = [];
    return genericObjects;
};

function displayInitialSearchResults(senderId, queryResults, user) {
    var elements = [];
    queryResults.forEach(function(prospect) {
        var payload = [];
        payload.post_owner = prospect.sender_id;
        // PostId needed for "Delete" button for receiving user
        if (propspect.driver_id) {
            var postId = propspect.driver_id
        } else {
            var postId = propspect.rider_id
        }
        payload.post_id = postId;
        payload.post_pinger = senderId;
        payload.post_pinger_first_name = user.first_name;

        var genericObject = {
            title: prospect.first_name + " " + prospect.last_name,
            subtitle: "Asking $" + prospect.asking_price + " for ride on " + prospect.departure_date,
            item_url: 'https://www.facebook.com/search/people/?q=' + prospect.first_name + '%20' + prospect.last_name,
            image_url: prospect.profile_pic,
            buttons: [
                {
                    type: "web_url",
                    title: "🔍 & chat with " + prospect.first_name๋,
                    url: 'https://www.facebook.com/search/people/?q=' + prospect.first_name + '%20' + prospect.last_name
                }
                // , {
                //     type: "postback",
                //     title: "Ping " + prospect.first_name,
                //     payload: payload
                // }
            ]
        };
        elements.push(genericObject);
    });

    if (callback) {
        callSendAPI(obj.createGenericMessageData(senderId, elements), callback());
    } else {
        callSendAPI(obj.createGenericMessageData(senderId, elements));
    }
    return;
};

function displayQueryResults(senderId, queryresults, user, callback) {

    var elements = [];
    for (var i = 0; i < queryresults.length; i++) {

        if (user.profile_pic) {
            user.match = queryresults[i].sender_id;
            if (queryresults[i].asking_price) {
                user.target = queryresults[i].driver_id;
            } else {
                user.target = queryresults[i].rider_id;
            }
            user.sender_id = senderId;
            user.comeback = queryresults[i].first_name;
            var payload = JSON.stringify(user);
        }

        var genericObject = {
            title: queryresults[i].first_name + " " + queryresults[i].last_name,
            subtitle: "Asking $" + queryresults[i].asking_price + " for ride on " + obj.convertDate(queryresults[i].departure_date),
            item_url: 'https://www.facebook.com/search/people/?q=' + queryresults[i].first_name + '%20' + queryresults[i].last_name,
            image_url: queryresults[i].profile_pic,
            buttons: [
                {
                    type: "web_url",
                    title: "🔍 & chat with " + queryresults[i].first_name,
                    url: 'https://www.facebook.com/search/people/?q=' + queryresults[i].first_name + '%20' + queryresults[i].last_name
                }
                // , {
                //     type: "postback",
                //     title: "Ping " + queryresults[i].first_name,
                //     payload: payload
                // }
            ]
        };

        if (!queryresults[i].asking_price) {
            if (queryresults[i].day_trip == true) {
                genericObject.subtitle = "Looking for a ride for a daytrip on " + obj.convertDate(queryresults[i].departure_date)
            } else {
                genericObject.subtitle = "Looking for a one way ride on " + obj.convertDate(queryresults[i].departure_date) + " in the " + queryresults[i].departure_time + " from " + queryresults[i].departure_location
            }
        };

        if (!user) {
            genericObject.buttons.pop()
        };

        // Adding trash button
        if (user.checkingStatus) {
            genericObject.buttons.pop();
            genericObject.buttons.pop();
            var additionalButton = obj.trashPostButton(user.checkingStatus, queryresults[i].rider_id)
            genericObject.buttons.push(additionalButton);
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
    if (callback) {
        callSendAPI(messageData, callback());
    } else {
        callSendAPI(messageData);
    }
    return;
};

function pingOfferer(senderId, user) {
    var user1 = JSON.parse(user);
    var genericObject = [
        {
            title: user1.first_name + " " + user1.last_name,
            subtitle: "Offering a ride " + user1.departure_date + " from " + user1.departure_location + " for $" + user1.asking_price,
            item_url: 'https://www.facebook.com/search/people/?q=' + user1.first_name + '%20' + user1.last_name,
            image_url: user1.profile_pic,
            buttons: [
                {
                    type: "web_url",
                    title: "🔍 & chat with " + user1.first_name,
                    url: 'https://www.facebook.com/search/people/?q=' + user1.first_name + '%20' + user1.last_name
                }, {
                    type: "postback",
                    title: "Found a 🚗  already...",
                    payload: "Delete_query:yes,Driver_id:" + user1.target + ",ping:" + user1.sender_id + ",comeback:" + user1.comeback + ",senderId:" + senderId + ",first_name:" + user1.first_name
                }
            ]
        }
    ];

    if (!user1.asking_price) {
        genericObject[0].subtitle = "Asking for your ride " + user1.departure_date + " from " + user1.departure_location;
        genericObject[0].buttons.pop();
        var alternativeButton = {
            type: "postback",
            title: "Sorry, 🚗  is full",
            payload: "Delete_query:yes,Rider_id" + user1.target + ",ping:" + user1.sender_id + ",comeback:" + user1.comeback + ",senderId:" + senderId + ",first_name:" + user1.first_name
        }
        genericObject[0].buttons.push(alternativeButton);
    };

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

function startOver(recipientId, callback) {
    var Qtext = "Tap Restart to start over";
    var quickreplypairs = [
        {
            "Restart": "start"
        }
    ];
    callSendAPI(obj.createQuickReplyMessageData(recipientId, Qtext, quickreplypairs));
    if (callback) {callback()};
};

function start(recipientId) {
    var Qtext = "Tap Get Started to... well... get started duh";
    var quickreplypairs = [
        {
            "Get Started": "start"
        }
    ];
    callSendAPI(obj.createQuickReplyMessageData(recipientId, Qtext, quickreplypairs));
};

function DeleteRecord(payload, callback) {
    var parsedObject = parseConditions(payload);
    if (parsedObject.DELETE_RIDER) {
        var driver_or_rider = "rider";
        var id = parsedObject.DELETE_RIDER
    } else {
        var driver_or_rider = "driver";
        var id = parsedObject.DELETE_DRIVER
    };
    pg.connect(db, function(err, client, done) {
        client.query("DELETE FROM " + driver_or_rider + " WHERE " + driver_or_rider + "_id = " + id);
        done();
    });
    if (callback) {
        callback()
    };
}

function DeleteRecord2(driver_or_rider, id) {
    pg.connect(db, function(err, client, done) {
        if (err) {
            console.log(err)
        };
        client.query("DELETE FROM " + driver_or_rider + " WHERE " + driver_or_rider + "_id = " + id, function(err, result) {
            if (err) {
                console.log(err)
            };
            if (result) {
                console.log(result)
            };
            done();
        });
    });
};

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
    callSendAPI(messageData);
    if (callback) {callback()};
}

function callSendAPI(messageData, callback) {
    request({
        uri: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {
            access_token: token
        },
        method: 'POST',
        json: messageData

    }, function(error, response, body, callback) {
        if (!error && response.statusCode == 200) {
            if (callback) {
                callback()
            };
        } else {
            console.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
        }
    });
}
