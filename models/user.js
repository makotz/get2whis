var mongoose = require('mongoose');


var UserSchema = new mongoose.Schema({

  sender: {
    type: Number,
    required: true,
    index: { unique: true }
  },
  first_name: String,
  last_name: String,
  profile_pic: String,
  drive_or_ride: Boolean,
  gender: String,
  ride_info: Object,
  created_at: Date,
  updated_at: Date
});

var User = mongoose.model('user', UserSchema);
module.exports = User;
