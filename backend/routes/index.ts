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
    cookie: { secure: true, maxAge: 24 * 60 * 60 * 1000 },
  })
);

var scalekit = new ScalekitClient(
  process.env.SCALEKIT_ENVIRONMENT_URL || '',
  process.env.SCALEKIT_CLIENT_ID || '',
  process.env.SCALEKIT_CLIENT_SECRET || ''
);

const connectionId = 'conn_59505293326811411';
const organizationID = 'org_59505282790721026'; 
const redirectURI = 'http://localhost:3001/callback';

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
  let errorMessage;
  const { code, error, idp_initiated_login } = req.query;
  console.log('/callback: req.query:\n', JSON.stringify(req.query, null, 2));

  if (idp_initiated_login) {
    const decodedDetails = jwt.decode(idp_initiated_login);
    res.status(200).json(decodedDetails);
  }

  if (error) {
    errorMessage = `Redirect callback error: ${error}`;
  } else {
    const profile = await scalekit.authenticateWithCode(code, redirectURI);
    console.log('profile:', profile);
    const decodedDetails = jwt.decode(profile.idToken);
    res.status(200).json(decodedDetails);

    session.email = decodedDetails.email;
    session.isloggedin = true;
  }

  if (errorMessage) {
    console.error('Unable to exchange code for token:', errorMessage);
    res.status(500).send(errorMessage);
  }

  return;
});

export default router;
