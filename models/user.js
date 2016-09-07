var mongoose = require('mongoose');

var userSchema = new mongoose.Schema({
  username: String,
  email: String,
  instagramId: String,
  fullName: String,
  picture: String,
  InstagramAccessToken: String,
  facebookId: String,
  name: String,
  facebookAccessToken: String
})

module.exports = mongoose.model('User', userSchema)
