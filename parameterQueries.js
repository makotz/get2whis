
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
};
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
};
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
};
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
};
function askDepartureDate(recipientId, othervariables) {
    var today = moment().calendar();
    var tomorrow = moment().add(1, 'days').calendar();
    var dayAfterTomorrow = moment().add(2, 'days').calendar();

    // today = moment.tz('America/Vancouver').format();
    // tomorrow = moment.tz('America/Vancouver').format();
    // dayAfterTomorrow = moment.tz('America/Vancouver').format();
    //

    // today = dateFormat(today, "ddd, mmm. dS");
    // tomorrow = dateFormat(tomorrow, "ddd, mmm. dS");
    // dayAfterTomorrow = dateFormat(dayAfterTomorrow, "ddd, mmm. dS");

    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            text: "What day are you riding?",
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
};;
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
};
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
};
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
};
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
};
function checkUserRideInfo(recipientId, driveOrRide) {
  var results = [];

  pg.connect(process.env.DATABASE_URL, function(err, client, done) {
    var userQuery = client.query("SELECT * FROM "+ driveOrRide +"r WHERE sender_id = '"+recipientId+"' LIMIT 10");

    userQuery.on('row', (row) => {
      results.push(row);
    });
    userQuery.on('end', () => {
      done();
      if (results.length > 0) {
        sendTextMessage(recipientId, "Here are your offers/asks:");
        pushQueryResults(recipientId, results);
        return
      } else {
        sendTextMessage(recipientId, "Looks like you haven't made one yet!");
        return
      };
    });

  });
}

module.exports = {
  'askWhichVariableToChange': askWhichVariableToChange,
  'askDriveOrRide': askDriveOrRide,
  'askDepartureLocation': askDepartureLocation,
  'askDayTrip': askDayTrip,
  'askDepartureTime': askDepartureTime,
  'askAskingPrice': askAskingPrice,
  'askAvailableSeats': askAvailableSeats,
  'checkUserDriveOrRide': checkUserDriveOrRide,
  'checkUserRideInfo': checkUserRideInfo
}
