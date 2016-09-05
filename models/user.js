var mongoose = require('mongoose');

var userSchema = new mongoose.Schema({
  username: {type: String, required: true, unique: true},
  email: {type: String, required: true, unique: true},
  instagramId: String
})

module.exports = mongoose.model('User', userSchema)
