import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

import { env } from "./env.js";
import { authService } from "../services/auth.service.js";

passport.use(
  new GoogleStrategy(
    {
      clientID: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/v1/auth/oauth/google/callback",
      proxy: true
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const user = await authService.getOrCreateGoogleUser(profile);
        done(null, user);
      } catch (error) {
        done(error as Error);
      }
    }
  )
);

export { passport };
