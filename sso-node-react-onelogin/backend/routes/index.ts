import express from 'express';
import session from 'express-session';
import jwt from 'jsonwebtoken';
import { ScalekitClient } from '@scalekit-sdk/node';
import cors from "cors";

const app = express();
const router = express.Router();

app.use(
  cors({
    origin: "http://localhost:3000", // Allow frontend
    methods: "GET,POST,PUT,DELETE,OPTIONS", // Allowed methods
    allowedHeaders: "Content-Type,Authorization", // Allowed headers
    credentials: true, // Allow cookies/session sharing if needed
  })
);


app.use(
  session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }, // secure: false for local dev
  })
);

var scalekit = new ScalekitClient(
  process.env.SCALEKIT_ENVIRONMENT_URL || '',
  process.env.SCALEKIT_CLIENT_ID || '',
  process.env.SCALEKIT_CLIENT_SECRET || ''
);

const connectionId = process.env.SCALEKIT_CONNECTION_ID || '';
const organizationID = process.env.SCALEKIT_ORGANIZATION_ID || ''; 
const redirectURI = 'http://localhost:3000/callback';

router.get('/', (req, res) => {
  if (session.isloggedin) {
    res.render('loggedin.ejs', {
      profile: session.profile,
      firstName: session.firstName,
    });
  }
  res.render('index.ejs', { title: 'Home' });
});

router.post('/login', (req, res) => {
  let login_type = req.body.login_method;

  console.log('/login: req.body', req.body);

  var options = {};
  console.log('login_type:', login_type);
  if (login_type === 'saml') {
    options['organizationId'] = organizationID;
    options['connectionId'] = connectionId;
  } else {
    options['provider'] = login_type;
  }
  try {
    console.log('options:', options);
    const authorizationUrl = scalekit.getAuthorizationUrl(redirectURI, {
      ...options,
    });
    console.log('authorizationUrl:', authorizationUrl);
    res.json({ authorizationUrl });
  } catch (error) {
    console.error('Error redirecting to authorization URL:', error);
    res.status(500).send('Internal Server Error');
  }
});

router.get('/callback', async (req, res) => {
  const { code, error, idp_initiated_login } = req.query;
  console.log('/callback: req.query:\n', JSON.stringify(req.query, null, 2));

  // Handle IDP-initiated login
  if (idp_initiated_login) {
    const decodedDetails = jwt.decode(idp_initiated_login);
    return res.status(200).json(decodedDetails); // Ensure function returns
  }

  // Handle errors from OAuth provider
  if (error) {
    console.error('Redirect callback error:', error);
    return res.status(400).json({ error: "invalid_request", message: error });
  }

  // Ensure `code` exists before proceeding
  if (!code) {
    console.error('Error: Authorization code missing');
    return res.status(400).json({ error: "invalid_request", message: "Code missing" });
  }

  try {
    console.log(`Authenticating with code: ${code}`);
    
    // Authenticate and exchange the code for tokens
    const profile = await scalekit.authenticateWithCode(code, redirectURI);
    
    console.log('Authenticated Profile:', profile);

    const decodedDetails = jwt.decode(profile.idToken);
    
    // Store session information correctly
    req.session.email = decodedDetails.email;
    req.session.isloggedin = true;

    console.log("Session updated:", req.session);

    return res.status(200).json(decodedDetails);
  } catch (err) {
    console.error('Error authenticating:', err.response?.data || err.message);
    
    if (err.response?.data?.error === "invalid_grant") {
      return res.status(400).json({ error: "invalid_grant", message: "The provided code is invalid or expired." });
    }

    return res.status(500).json({ error: "authentication_failed", message: err.message });
  }
});

export default router;
