// server/config/passport.js
const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const User = require('../models/User');

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL
},
  async (accessToken, refreshToken, profile, done) => {
    try {
      // 1) Try to find an existing user by googleId
      let user = await User.findOne({ googleId: profile.id });
      if (user) return done(null, user);

      // 2) Or find by email and link accounts
      const email = profile.emails?.[0]?.value;
      if (email) {
        user = await User.findOne({ email });
        if (user) {
          user.googleId = profile.id;
          await user.save();
          return done(null, user);
        }
      }

      // 3) Otherwise, create a new user
      const name = profile.displayName || email;
      user = await User.create({
        name,
        email,
        googleId: profile.id,
        // no passwordHash: they’ll login via Google
      });
      return done(null, user);
    } catch (err) {
      done(err, false);
    }
  }
));
