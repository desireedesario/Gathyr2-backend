var express  = require('express');
var router   = express.Router();
var request = require('request');
var jwt = require('jwt-simple');
var moment = require('moment');
var qs = require('querystring');
var Twitter = require('twitter');
var User = require('../models/user');

router.post('/auth/facebook', function(req, res) {
  var accessTokenUrl = 'https://graph.facebook.com/v2.5/oauth/access_token';

  var params = {
    client_id: req.body.clientId,
    redirect_uri: req.body.redirectUri,
    client_secret: process.env.FACEBOOK_CLIENT_SECRET,
    code: req.body.code,
    grant_type: 'authorization_code'
  };
  // Step 1\. Exchange authorization code for access token.
  request.post({ url: accessTokenUrl, form: params, json: true }, function(error, response, body) {
    if (error) console.log(error)

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
          User.findOne({ facebook: { id: response.body.id }}, function(err, existingUser) {
            if (err) console.log(err)

            var token = req.headers.authorization.split(' ')[1];
            var payload = jwt.decode(token, process.env.TOKEN_SECRET);

            User.findById(payload.sub, '+password', function(err, localUser) {
              if (!localUser) {
                return res.status(400).send({ message: 'User not found.' });
              }

              // Merge two accounts.
              if (existingUser) {

                existingUser.facebook.id = localUser.facebook.id;
                existingUser.facebook.name = localUser.facebook.name;
                existingUser.facebook.accessToken = localUser.facebook.accessToken

                localUser.remove();

                existingUser.save(function() {
                  var token = createToken(existingUser);
                  return res.send({ token: token, user: existingUser });
                });

              } else {
                // Link current email account with the Instagram profile information.
                localUser.facebook.id = response.body.id;
                localUser.facebook.name = response.body.name;
                localUser.facebook.accessToken = body.access_token;

                localUser.save(function() {
                  var token = createToken(localUser);
                  res.send({ token: token, user: localUser });
                });

              }
            });
          });
        } else {
          // Step 2b. Create a new user account or return an existing one.
          User.findOne({ facebook: { id: response.body.id }}, function(err, existingUser) {
            if (err) console.log(err)

            if (existingUser) {
              var token = createToken(existingUser);
              existingUser.facebook.accessToken = body.access_token
              console.log(existingUser.facebook.accessToken)
              existingUser.save(function(err, savedUser) {
                if (err) console.log(err);
                res.send({ token: token, user: savedUser });
              })
            } else {
              var user = new User({
                facebook: { id: response.body.id },
                facebook: { name: response.body.name },
                facebook: { accessToken: body.access_token }
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
  var params = { access_token: req.user.facebook.accessToken };
  var feedUrl = 'https://graph.facebook.com/me/feed/?access_token=' + params.access_token

  request.get(feedUrl, function(error, response, body) {
    if (error) {
      console.log(error)
    } else if (!error && response.statusCode == 200) {
      console.log(response.statusCode)
      res.send(JSON.parse(body).data);
    } else {
      console.log(response.statusCode)
    }
  })
});

router.post('/auth/instagram', function(req, res) {
  var accessTokenUrl = 'https://api.instagram.com/oauth/access_token';

  var params = {
    client_id: req.body.clientId,
    redirect_uri: req.body.redirectUri,
    client_secret: process.env.INSTAGRAM_CLIENT_SECRET,
    code: req.body.code,
    grant_type: 'authorization_code'
  };

  // Step 1\. Exchange authorization code for access token.
  request.post({ url: accessTokenUrl, form: params, json: true }, function(error, response, body) {

    // Step 2a. Link  user accounts.
    if (req.headers.authorization) {

      User.findOne({ instagram: { id: body.user.id }}, function(err, existingUser) {

        var token = req.headers.authorization.split(' ')[1];
        var payload = jwt.decode(token, process.env.TOKEN_SECRET);
        User.findById(payload.sub, '+password', function(err, localUser) {
          if (!localUser) {
            return res.status(400).send({ message: 'User not found.' });
          }

          // Merge two accounts.
          if (existingUser) {

            existingUser.instagram.id = localUser.instagram.id
            existingUser.instagram.username = localUser.instagram.username
            existingUser.instagram.fullName = localUser.instagram.fullName
            existingUser.instagram.picture = localUser.instagram.picture
            existingUser.instagram.accessToken = localUser.instagram.accessToken

            localUser.remove();

            existingUser.save(function() {
              var token = createToken(existingUser);
              return res.send({ token: token, user: existingUser });
            });

          } else {

            // Link current email account with the Instagram profile information.
            localUser.instagram.id = body.user.id;
            localUser.instagram.username = body.user.username;
            localUser.instagram.fullName = body.user.full_name;
            localUser.instagram.picture = body.user.profile_picture;
            localUser.instagram.accessToken = body.access_token;

            localUser.save(function() {
              var token = createToken(localUser);
              res.send({ token: token, user: localUser });
            });

          }
        });
      });
    } else {
      // Step 2b. Create a new user account or return an existing one.
      User.findOne({ instagram: { id: body.user.id }}, function(err, existingUser) {

        if (existingUser) {
          var token = createToken(existingUser);
          existingUser.instagram.accessToken = body.access_token

          existingUser.save(function(err, savedUser) {
            if (err) console.log(err);
            res.send({ token: token, user: savedUser });
          })
        } else {
          var user = new User({
            instagram: { id: body.user.id },
            instagram: { username: body.user.username },
            instagram: { fullName: body.user.full_name },
            instagram: { picture: body.user.profile_picture },
            instagram: { accessToken: body.access_token }
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
  var params = { access_token: req.user.instagram.accessToken };

  request.get({ url: feedUrl, qs: params, json: true}, function(error, response, body) {
    if (error) {
      console.log(error)
    } else if (!error && response.statusCode == 200) {
      res.send(body.data);
    } else {
      console.log(response.statusCode)
    }
  })
});

router.post('/auth/twitter', function(req, res) {
  var requestTokenUrl = 'https://api.twitter.com/oauth/request_token';
  var accessTokenUrl = 'https://api.twitter.com/oauth/access_token';
  var profileUrl = 'https://api.twitter.com/1.1/account/verify_credentials.json';

  // Part 1 of 2: Initial request from Satellizer.
  if (!req.body.oauth_token || !req.body.oauth_verifier) {
    var requestTokenOauth = {
      consumer_key: 'HxYPEZHZ0NHd2ugkTv3673Q1N',
      consumer_secret: process.env.TWITTER_CLIENT_SECRET,
      callback: req.body.redirectUri
    };

    // Step 1. Obtain request token for the authorization popup.
    request.post({ url: requestTokenUrl, oauth: requestTokenOauth }, function(err, response, body) {
      var oauthToken = qs.parse(body);

      // Step 2. Send OAuth token back to open the authorization screen.
      res.send(oauthToken);
    });
  } else {
    // Part 2 of 2: Second request after Authorize app is clicked.
    var accessTokenOauth = {
      consumer_key: 'HxYPEZHZ0NHd2ugkTv3673Q1N',
      consumer_secret: process.env.TWITTER_CLIENT_SECRET,
      token: req.body.oauth_token,
      verifier: req.body.oauth_verifier
    };

    // Step 3. Exchange oauth token and oauth verifier for access token.
    request.post({ url: accessTokenUrl, oauth: accessTokenOauth }, function(err, response, accessToken) {

      accessToken = qs.parse(accessToken);


      var profileOauth = {
        consumer_key: 'HxYPEZHZ0NHd2ugkTv3673Q1N',
        consumer_secret: process.env.TWITTER_CLIENT_SECRET,
        token: accessToken.oauth_token,
        token_secret: accessToken.oauth_token_secret,
      };

      // Step 4. Retrieve user's profile information and email address.
      request.get({
        url: profileUrl,
        qs: { include_email: true },
        oauth: profileOauth,
        json: true
      }, function(err, response, profile) {

        // Step 5a. Link user accounts.
        if (req.header('Authorization')) {
          User.findOne({ twitter: { id: profile.id }}, function(err, existingUser) {
            if (existingUser) {
              return res.status(409).send({ message: 'There is already a Twitter account that belongs to you' });
            }

            var token = req.header('Authorization').split(' ')[1];
            var payload = jwt.decode(token, process.env.TOKEN_SECRET);

            User.findById(payload.sub, function(err, existingUser) {
              if (!existingUser) {
                return res.status(400).send({ message: 'User not found' });
              }

              existingUser.twitter.id = profile.id;
              existingUser.twitter.email = profile.email;
              existingUser.twitter.displayName = profile.name;
              existingUser.twitter.picture = profile.profile_image_url_https.replace('_normal', '');
              existingUser.twitter.accessToken = profile.accessToken
              existingUser.save(function(err) {
                res.send({ token: createToken(existingUser) });
              });
            });
          });
        } else {
          // Step 5b. Create a new user account or return an existing one.
          User.findOne({ twitter: { id: profile.id }}, function(err, existingUser) {
            if (existingUser) {
              return res.send({ token: createToken(existingUser) });
            }

            var user = new User();
            existingUser.twitter.id = profile.id;
            existingUser.twitter.email = profile.email;
            existingUser.twitter.displayName = profile.name;
            existingUser.twitter.picture = profile.profile_image_url_https.replace('_normal', '');
            existingUser.twitter.accessToken = profile.accessToken
            existingUser.save(function() {
              res.send({ token: createToken(user) });
            });
          });
        }
      });
    });
  }
});
// This is part of the setup for /api/twitter/feed
var client = new Twitter({
  consumer_key: 'HxYPEZHZ0NHd2ugkTv3673Q1N',
  consumer_secret: process.env.TWITTER_CLIENT_SECRET,
  access_token_key: '770331880390467584-2NNGsgM7BusC3Lb6fQRng4TwG6IeL5Q',
  access_token_secret: 'O127bXX7s3FroQtBLCbKQqA4aMpa3Z6UQkyJJ5c32vkHa'
})

router.get('/api/twitter/feed', isAuthenticated, function(req, res) {

  client.get('statuses/home_timeline', {screen_name: req.user.twitter.displayName}, function(err, tweets, response) {
    if (err) console.log(err);
    res.send(tweets)
  })
})

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
