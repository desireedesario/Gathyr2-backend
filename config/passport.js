var mongoose = require('mongoose');
var passport = require('passport');
var User = require('../models/user');
var InstagramStrategy = require('passport-instagram').Strategy

passport.use(new InstagramStrategy({
    clientID: '8275245eeb284ad2a806eaccde1ee1d6',
    clientSecret: 'a5ce3b0ce6e240cfbef9c8a810e8c645',
    callbackURL: "http://localhost:3000/auth/instagram/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    User.findOrCreate({ instagramId: profile.id }, function (err, user) {
      return done(err, user);
    });
  }
));
