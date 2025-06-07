// server/config/passport.js
/*  Google OAuth 2.0 strategy with proper first/last-name mapping
    ------------------------------------------------------------
    - Links Google accounts to existing e-mail users if they match
    - Fills in firstName / lastName (instead of a single “name” field)
    - Creates brand-new users when no match is found
    - No sessions (JWT-only app), so serialize/deserialize are unnecessary
*/

const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const User = require('../models/User');

// ─────────────────────────────────────────────  Strategy  ─────────────────────────────────────────────
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL, // e.g. http://localhost:5000/api/auth/google/callback
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        /* STEP 1 ──────────  Already signed up via Google before? */
        let user = await User.findOne({ googleId: profile.id });
        if (user) return done(null, user);

        /* STEP 2 ──────────  Same e-mail exists? (link accounts) */
        const email = profile.emails?.[0]?.value;
        if (email) {
          user = await User.findOne({ email });
          if (user) {
            user.googleId = profile.id;

            // patch names if the original local account lacked them
            if (!user.firstName) {
              const [given, ...rest] = (profile.displayName || '').trim().split(' ');
              user.firstName = given || 'Google';
              user.lastName = rest.join(' ') || 'User';
            }
            await user.save();
            return done(null, user);
          }
        }

        /* STEP 3 ──────────  Create brand-new user */
        const [first, ...rest] = (profile.displayName || '').trim().split(' ');
        user = await User.create({
          firstName: first || 'Google',
          lastName: rest.join(' ') || 'User',
          email: email,          // may be undefined if Google doesn’t return it
          googleId: profile.id,
          isVerified: true,           // Google e-mail is already verified
        });
        return done(null, user);
      } catch (err) {
        return done(err, false);
      }
    }
  )
);

// No serialize/deserialize needed (stateless JWT auth)
module.exports = passport;
