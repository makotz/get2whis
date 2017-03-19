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
        payload: 'deleteQuery:true,table:'+driverOrRiderTable+ ",id:"+ postId
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
  }


};
