var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var UserSchema = new Schema({

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
  created_at: Date,
  updated_at: Date
});

module.exports = mongoose.model('user', UserSchema)
