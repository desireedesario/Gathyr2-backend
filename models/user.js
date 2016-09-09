var mongoose = require('mongoose');

var userSchema = new mongoose.Schema({
  facebook: {
    id: String,
    name: String,
    accessToken: String
  },
  instagram: {
    id: String,
    username: String,
    fullName: String,
    picture: String,
    accessToken: String
  },
  twitter: {
    id: String,
    email: String,
    displayName: String,
    picture: String,
    accessToken: String
  }
})

module.exports = mongoose.model('User', userSchema)
