const token = process.env.FB_PAGE_ACCESS_TOKEN;
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
    sendTextMessage(payload, "Postback called");
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

module.exports = {
  'receivedDeliveryConfirmation': receivedDeliveryConfirmation,
  'receivedMessageRead': receivedMessageRead,
  'receivedAccountLink': receivedAccountLink,
  'receivedAuthentication': receivedAuthentication,
  'callSendAPI': callSendAPI,
  'receivedPostback': receivedPostback,
  'sendTextMessage': sendTextMessage
}
