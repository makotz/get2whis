function checkPingLimit(driverOrRiderTable, postId, senderId) {
  var results = [];
  pg.connect(db, function(err, client, done) {
      var limitQuery = client.query("SELECT * FROM pingTable WHERE " + driverOrRiderTable + " WHERE sender_id = '" + senderId + "'");
      var user = {
          checkingStatus: driveOrRide
      };
      userQuery.on('row', (row) => {
          results.push(row);
      });
      userQuery.on('end', () => {
          done();
          if (results.length > 0) {
              sendTextMessage(sender, "Here are your posts:", displayQueryResults(sender, results, user))
              return
          } else {
              sendTextMessage(sender, "Looks like you haven't made one yet!");
              return
          };
      });
  });
}
