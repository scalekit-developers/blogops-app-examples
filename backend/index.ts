import express from 'express';
import session from 'express-session';
import morgan from 'morgan';
import router from './routes/index';
import cors from "cors";

const app = express();

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

const PORT = process.env.PORT || 3001;

app.use('/public', express.static('public'));

app.use(express.urlencoded({ extended: false }));

app.use(express.json());

app.use(morgan('dev'));

app.use('/', router);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
