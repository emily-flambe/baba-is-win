import type { APIRoute } from 'astro';
import { GoogleOAuthService } from '../../../../lib/oauth/google';
import { getGoogleOAuthConfig } from '../../../../lib/oauth/config';
import { OAuthStateManager } from '../../../../lib/oauth/state';
import { UserManager } from '../../../../lib/auth/user-manager';
import { AuthService } from '../../../../lib/auth/auth-service';
import { OAuthRequestValidator } from '../../../../lib/oauth/validation';
import { OAuthSecurityMonitor } from '../../../../lib/oauth/security-monitor';

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    // Input validation
    const validation = OAuthRequestValidator.validateCallbackRequest(request);
    if (!validation.valid) {
      await OAuthSecurityMonitor.logSecurityEvent('invalid_callback', 'high', {
        errors: validation.errors
      }, request);

      return new Response(null, {
        status: 302,
        headers: {
          Location: '/login?error=invalid_request'
        }
      });
    }

    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    if (error) {
      await OAuthSecurityMonitor.monitorOAuthAttempt(null, false, error, request);
      
      return new Response(null, {
        status: 302,
        headers: {
          Location: `/login?error=${encodeURIComponent(error)}`
        }
      });
    }

    if (!code || !state) {
      await OAuthSecurityMonitor.monitorOAuthAttempt(null, false, 'missing_parameters', request);
      
      return new Response(null, {
        status: 302,
        headers: {
          Location: '/login?error=missing_parameters'
        }
      });
    }

    console.log('OAuth callback step 1: Initializing services');
    const config = getGoogleOAuthConfig(locals.runtime.env);
    const oauthService = new GoogleOAuthService(config);
    const stateManager = new OAuthStateManager(locals.runtime.env.JWT_SECRET);
    const userManager = new UserManager(locals.runtime.env.DB);
    const authService = new AuthService(locals.runtime.env.JWT_SECRET);

    console.log('OAuth callback step 2: Verifying state');
    // Verify state
    const stateData = await stateManager.verifyState(state);
    console.log('State verified:', stateData);
    
    console.log('OAuth callback step 3: Exchanging code for tokens');
    // Exchange code for tokens
    const tokens = await oauthService.exchangeCodeForTokens(code);
    console.log('Tokens received (access_token length):', tokens.access_token.length);
    
    console.log('OAuth callback step 4: Verifying ID token');
    // Verify ID token
    await oauthService.verifyIdToken(tokens.id_token);
    console.log('ID token verified');
    
    console.log('OAuth callback step 5: Getting user info');
    // Get user info
    const userInfo = await oauthService.getUserInfo(tokens.access_token);

    // Debug logging to see what Google actually returns
    console.log('Google userInfo response:', JSON.stringify(userInfo, null, 2));
    console.log('email_verified value:', userInfo.email_verified);
    console.log('email_verified type:', typeof userInfo.email_verified);

    if (!userInfo.email_verified) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: '/login?error=email_not_verified'
        }
      });
    }

    let user;
    let isLinking = false;

    // Check if this is account linking
    if (stateData.linkAccount && stateData.userId) {
      const existingUser = await userManager.findUserByGoogleId(userInfo.sub);
      if (existingUser && existingUser.id !== stateData.userId) {
        return new Response(null, {
          status: 302,
          headers: {
            Location: '/profile?error=account_already_linked'
          }
        });
      }

      await userManager.linkGoogleAccount(stateData.userId, {
        googleId: userInfo.sub,
        email: userInfo.email,
        displayName: userInfo.name,
        profilePictureUrl: userInfo.picture,
        providerEmail: userInfo.email
      });

      user = await userManager.findUserById(stateData.userId);
      isLinking = true;

      await OAuthSecurityMonitor.logAccountLinking(stateData.userId, 'google', true, request);
    } else {
      // Check if user exists by Google ID
      user = await userManager.findUserByGoogleId(userInfo.sub);

      if (!user) {
        // Check if user exists by email
        const existingUser = await userManager.findUserByEmail(userInfo.email);
        
        if (existingUser) {
          // Email exists but not linked to Google account
          return new Response(null, {
            status: 302,
            headers: {
              Location: `/login?error=email_exists&email=${encodeURIComponent(userInfo.email)}`
            }
          });
        }

        // Create new user
        user = await userManager.createOAuthUser({
          googleId: userInfo.sub,
          email: userInfo.email,
          displayName: userInfo.name,
          profilePictureUrl: userInfo.picture,
          providerEmail: userInfo.email
        });

        await OAuthSecurityMonitor.logUserCreation(user.id, 'google', request);

        // Mark this as a new signup so we redirect to welcome page
        stateData.isNewSignup = true;
      } else {
        // Update existing OAuth user info
        await userManager.updateOAuthUser(userInfo.sub, {
          displayName: userInfo.name,
          profilePictureUrl: userInfo.picture
        });
      }
    }

    // Create session
    const sessionToken = await authService.createSession(user);
    
    // Set cookie
    const cookie = authService.createCookie(sessionToken);
    
    // Redirect new OAuth signups to welcome page for email preferences
    const returnUrl = stateData.isNewSignup ? '/welcome' : (stateData.returnUrl || (isLinking ? '/profile' : '/'));

    // Log successful OAuth completion
    await OAuthSecurityMonitor.monitorOAuthAttempt(user.id, true, undefined, request);
    
    return new Response(null, {
      status: 302,
      headers: {
        Location: returnUrl,
        'Set-Cookie': cookie,
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin'
      }
    });

  } catch (error) {
    console.error('OAuth callback error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    await OAuthSecurityMonitor.monitorOAuthAttempt(null, false, 'oauth_failed', request);
    await OAuthSecurityMonitor.logSecurityEvent('oauth_callback_error', 'high', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    }, request);

    return new Response(null, {
      status: 302,
      headers: {
        Location: '/login?error=oauth_failed'
      }
    });
  }
};