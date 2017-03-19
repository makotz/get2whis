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

};
