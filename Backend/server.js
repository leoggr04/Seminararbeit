const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const usersRouter = require('./routes/users');
const authRouter = require('./routes/auth');
const activitiesRouter = require('./routes/activities');
const chatsRouter = require('./routes/chats');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./docs/openapi');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors(cors({
  origin: '*',  // für Swagger, wenn in prod geht muss das weg!!! TODO
})));
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello World from Express!');
});

app.use('/api/users', usersRouter);
app.use('/api/auth', authRouter);
app.use('/api/activities', activitiesRouter);
app.use('/api/chats', chatsRouter);

// Swagger UI
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
