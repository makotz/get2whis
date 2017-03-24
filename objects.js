const moment = require('moment-timezone');

module.exports = {

  createQuickReplyMessageData: function(recipientId, Qtext, quickreplypairs) {
      var quick_replies = [];
      quickreplypairs.forEach(function(keyvaluepair) {
          for (var key in keyvaluepair) {
              var quick_reply = {
                  "content_type": "text",
                  "title": key,
                  "payload": keyvaluepair[key]
              }
          }
          quick_replies.push(quick_reply);
      });
      var messageData = {
          recipient: {
              id: recipientId
          },
          message: {
              text: Qtext,
              quick_replies: quick_replies
          }
      };
      return messageData;
  },

  trashPostButton: function(driverOrRiderTable, postId) {
    var button = {
        type: "postback",
        title: "Trash post",
        payload: '{deleteQuery:true,table:'+driverOrRiderTable+ ",postId:"+ postId+"}"
    };
    return button;
  },

  convertDate: function(dateTime) {
    var convertedDate = moment(dateTime).format("ddd. MMM. Do");
    return convertedDate;
  },

  createGenericMessageData: function(senderId, elements) {
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
      return messageData;
  },

  receivedAuthentication: function(event) {
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
      // sendTextMessage(senderID, "Authentication successful");
  },

  receivedDeliveryConfirmation: function(event) {
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
  },

  receivedMessageRead: function(event) {
      var senderID = event.sender.id;
      var recipientID = event.recipient.id;

      // All messages before watermark (a timestamp) or sequence have been seen.
      var watermark = event.read.watermark;
      var sequenceNumber = event.read.seq;

      console.log("Received message read event for watermark %d and sequence " +
          "number %d",
      watermark, sequenceNumber);
  },

  receivedAccountLink: function(event) {
      var senderID = event.sender.id;
      var recipientID = event.recipient.id;

      var status = event.account_linking.status;
      var authCode = event.account_linking.authorization_code;

      console.log("Received account link event with for user %d with status %s " +
          "and auth code %s ",
      senderID, status, authCode);
  },

  createGenericObject: function(object) {
      var genericObject = {
          title: object.title,
          subtitle: object.subtitle,
          item_url: object.item_url,
          image_url: object.image_url
      };
      if (object.buttons) {
        var buttons = [];
        object.buttons.forEach(function(button) {
          var insertButton =  {
          type: button.type,
          title: button.title,
          url: button.url
        };
        buttons.push(insertButton);
      })
        genericObject.buttons = buttons;
      };
      return genericObject;
  }
}
