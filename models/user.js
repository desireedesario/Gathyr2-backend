var mongoose = require('mongoose');

var userSchema = new mongoose.Schema({
  username: {type: String, unique: true},
  email: {type: String, unique: true},
  instagramId: String,
  fullName: String,
  picture: String,
  accessToken: String
})

module.exports = mongoose.model('User', userSchema)
