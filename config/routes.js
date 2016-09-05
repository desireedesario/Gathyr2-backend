var express  = require('express');
var router   = express.Router();
var request = require('request');
var User = require('../models/user');
var jwt = require('jwt-simple');

router.post('/auth/instagram', function(req, res) {

  var accessTokenUrl = 'https://api.instagram.com/oauth/access_token';

  var params = {
    client_id: req.body.clientId,
    redirect_uri: req.body.redirectUri,
    client_secret: 'a5ce3b0ce6e240cfbef9c8a810e8c645',
    code: req.body.code,
    grant_type: 'authorization_code'
  };

  // Step 1\. Exchange authorization code for access token.
  request.post({ url: accessTokenUrl, form: params, json: true }, function(error, response, body) {

    // Step 2a. Link user accounts.
    if (req.headers.authorization) {

      User.findOne({ instagramId: body.user.id }, function(err, existingUser) {

        var token = req.headers.authorization.split(' ')[1];
        console.log('hello');
        var payload = jwt.decode(token, config.tokenSecret);

        User.findById(payload.sub, '+password', function(err, localUser) {
          if (!localUser) {
            return res.status(400).send({ message: 'User not found.' });
          }

          // Merge two accounts.
          if (existingUser) {

            existingUser.email = localUser.email;
            existingUser.password = localUser.password;

            localUser.remove();

            existingUser.save(function() {
              var token = createToken(existingUser);
              console.log(token)
              return res.send({ token: token, user: existingUser });
            });

          } else {
            // Link current email account with the Instagram profile information.
            localUser.instagramId = body.user.id;
            localUser.username = body.user.username;
            localUser.fullName = body.user.full_name;
            localUser.picture = body.user.profile_picture;
            localUser.accessToken = body.access_token;

            localUser.save(function() {
              var token = createToken(localUser);
              console.log(token)
              res.send({ token: token, user: localUser });
            });

          }
        });
      });
    } else {
      // Step 2b. Create a new user account or return an existing one.
      User.findOne({ instagramId: body.user.id }, function(err, existingUser) {
        if (existingUser) {
          var token = createToken(existingUser);
          console.log(token)
          return res.send({ token: token, user: existingUser });
        }

        var user = new User({
          instagramId: body.user.id,
          username: body.user.username,
          fullName: body.user.full_name,
          picture: body.user.profile_picture,
          accessToken: body.access_token
        });

        user.save(function() {
          var token = createToken(user);
          console.log(token)
          res.send({ token: token, user: user });
        });
      });
    }
  });
});


module.exports = router;
