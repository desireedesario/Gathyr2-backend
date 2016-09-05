var mongoose = require('mongoose');
var User = require('../models/user')
mongoose.connect('mongodb://localhost/gathyr2')

var users = [
  {
    username: 'RitoPunchBish',
    email: 'desireedesario@gmail.com'
  },
  {
    username: 'AndyMacAttack',
    email: 'theandrewfranklin@gmail.com'
  }
]

User.remove({}, function(err) {
  if (err) console.log(err);
  User.create(users, function(err, users) {
    if (err) {
      console.log(err);
    } else {
      console.log("Database seeded with " + users.length  + " users");
      mongoose.connection.close();
    }
    process.exit();
  });
});
