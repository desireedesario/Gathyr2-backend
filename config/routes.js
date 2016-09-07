var express  = require('express');
var router   = express.Router();
var request = require('request');
var User = require('../models/user');
var jwt = require('jwt-simple');
var moment = require('moment')

router.post('/auth/facebook', function(req, res) {
  var accessTokenUrl = 'https://graph.facebook.com/v2.5/oauth/access_token';

  var params = {
    client_id: req.body.clientId,
    redirect_uri: req.body.redirectUri,
    client_secret: '470283e47e7550bfed2c5feb73a9bd35',
    code: req.body.code,
    grant_type: 'authorization_code'
  };
  // Step 1\. Exchange authorization code for access token.
  request.post({ url: accessTokenUrl, form: params, json: true }, function(error, response, body) {
    console.log(body)

    request.get({ url: 'https://graph.facebook.com/me', qs: { access_token: body.access_token }, json: true }, function(error, response) {
      if (error) {
        console.log(error)
      } else if (!error && response.statusCode == 200) {
        console.log(response.statusCode)
        console.log(response.body.name)
        console.log(response.body.id)

        // Step 2a. Link user accounts.
        if (req.headers.authorization) {
          console.log('req header auth:', req.headers.authorization.split(' ')[1])
          User.findOne({ facebookId: response.body.id }, function(err, existingUser) {

            var token = req.headers.authorization.split(' ')[1];
            var payload = jwt.decode(token, process.env.TOKEN_SECRET);

            User.findById(payload.sub, '+password', function(err, localUser) {
              if (!localUser) {
                return res.status(400).send({ message: 'User not found.' });
              }

              // Merge two accounts.
              if (existingUser) {

                existingUser.facebookId = localUser.facebookId;
                existingUser.name = localUser.name;
                existingUser.facebookAccessToken = localUser.facebookAccessToken

                localUser.remove();

                existingUser.save(function() {
                  var token = createToken(existingUser);
                  return res.send({ token: token, user: existingUser });
                });

              } else {
                // Link current email account with the Instagram profile information.
                localUser.facebookId = response.body.id;
                localUser.name = response.body.name;
                localUser.facebookAccessToken = body.access_token;

                localUser.save(function() {
                  var token = createToken(localUser);
                  res.send({ token: token, user: localUser });
                });

              }
            });
          });
        } else {
          // Step 2b. Create a new user account or return an existing one.
          User.findOne({ facebookId: response.body.id }, function(err, existingUser) {

            if (existingUser) {
              var token = createToken(existingUser);
              existingUser.facebookAccessToken = body.access_token
              console.log(existingUser.facebookAccessToken)
              existingUser.save(function(err, savedUser) {
                if (err) console.log(err);
                res.send({ token: token, user: savedUser });
              })
            } else {
              var user = new User({
                facebookId: response.body.id,
                name: response.body.name,
                facebookAccessToken: body.access_token
              });

              user.save(function(err, savedUser) {
                if(err) console.log(err);
                var token = createToken(user);
                res.send({ token: token, user: user });
              });
            }
          });
        }
      } else {
        console.log('error:', response.statusCode)
      }
    })
  });
});

router.get('/api/facebook/feed', isAuthenticated, function(req, res) {
  var params = { access_token: req.user.facebookAccessToken };
  var feedUrl = 'https://graph.facebook.com/me/feed/?access_token=' + params.access_token
  console.log(req.user.facebookAccessToken)
  request.get(feedUrl, function(error, response, body) {
    if (error) {
      console.log(error)
    } else if (!error && response.statusCode == 200) {
      console.log(response.statusCode)
      console.log(JSON.parse(body).data)
      res.send(JSON.parse(body).data);
    } else {
      console.log('error:', response.statusCode)
    }
  })
});

router.post('/auth/instagram', function(req, res) {
  var accessTokenUrl = 'https://api.instagram.com/oauth/access_token';

  var params = {
    client_id: req.body.clientId,
    redirect_uri: req.body.redirectUri,
    client_secret: process.env.CLIENT_SECRET,
    code: req.body.code,
    grant_type: 'authorization_code'
  };

  // Step 1\. Exchange authorization code for access token.
  request.post({ url: accessTokenUrl, form: params, json: true }, function(error, response, body) {
    console.log('response body:', body);
    // Step 2a. Link  user accounts.
    if (req.headers.authorization) {

      User.findOne({ instagramId: body.user.id }, function(err, existingUser) {

        var token = req.headers.authorization.split(' ')[1];
        var payload = jwt.decode(token, process.env.TOKEN_SECRET);
        User.findById(payload.sub, '+password', function(err, localUser) {
          if (!localUser) {
            return res.status(400).send({ message: 'User not found.' });
          }

          // Merge two accounts.
          if (existingUser) {

            existingUser.instagramId = localUser.instagramId
            existingUser.username = localUser.username
            existingUser.fullName = localUser.fullName
            existingUser.picture = localUser.picture
            existingUser.InstagramAccessToken = localUser.InstagramAccessToken

            localUser.remove();

            existingUser.save(function() {
              var token = createToken(existingUser);
              return res.send({ token: token, user: existingUser });
            });

          } else {

            // Link current email account with the Instagram profile information.
            localUser.instagramId = body.user.id;
            localUser.username = body.user.username;
            localUser.fullName = body.user.full_name;
            localUser.picture = body.user.profile_picture;
            localUser.InstagramAccessToken = body.access_token;

            localUser.save(function() {
              var token = createToken(localUser);
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
          existingUser.InstagramAccessToken = body.access_token
          console.log(existingUser.InstagramAccessToken)
          existingUser.save(function(err, savedUser) {
            if (err) console.log(err);
            res.send({ token: token, user: savedUser });
          })
        } else {
          var user = new User({
            instagramId: body.user.id,
            username: body.user.username,
            fullName: body.user.full_name,
            picture: body.user.profile_picture,
            InstagramAccessToken: body.access_token
          });
          user.save(function(err, savedUser) {
            if(err) console.log(err);
            var token = createToken(user);
            res.send({ token: token, user: user });
          });
        }
      });
    }
  });
});

router.get('/api/instagram/feed', isAuthenticated, function(req, res) {
  var feedUrl = 'https://api.instagram.com/v1/users/self/media/recent'
  var params = { access_token: req.user.InstagramAccessToken };

  request.get({ url: feedUrl, qs: params, json: true}, function(error, response, body) {
    if (error) {
      console.log(error)
    } else if (!error && response.statusCode == 200) {
      console.log('success:', response.statusCode)
      console.log(body.data)
      res.send(body.data);
    } else {
      console.log('error:', response.statusCode, response)
    }
  })
});

module.exports = router;

function createToken(user) {
  var payload = {
    exp: moment().add(14, 'days').unix(),
    iat: moment().unix(),
    sub: user._id
  };
  return jwt.encode(payload, process.env.TOKEN_SECRET);
}

function isAuthenticated(req, res, next) {

  if (!(req.headers && req.headers.authorization)) {
    return res.status(400).send({ message: 'You did not provide a JSON Web Token in the Authorization header.' });
  }

  var header = req.headers.authorization.split(' ');
  var token = header[1];

  var payload = jwt.decode(token, process.env.TOKEN_SECRET);
  var now = moment().unix();

  if (now > payload.exp) {
    return res.status(401).send({ message: 'Token has expired.' });
  }

  User.findById(payload.sub, function(err, user) {
    if (!user) {
      return res.status(400).send({ message: 'User no longer exists.' });
    }

    req.user = user;
    next();
  })
}
