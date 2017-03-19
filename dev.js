function checkPingLimit(driverOrRiderTable, postId, senderId) {
  var results = [];
  pg.connect(db, function(err, client, done) {
      var limitQuery = client.query("SELECT * FROM pingTable WHERE table_name = '" + driverOrRiderTable + "' AND WHERE sender_id = '" + senderId + "' AND WHERE post_id = '"+postId+"'");
      limitQuery.on('row', (row) => {
          results.push(row);
      });
      limitQuery.on('end', () => {
          done();
          if (results.length > 1) {
              return false
          } else {
              return true
          };
      });
  });
}
