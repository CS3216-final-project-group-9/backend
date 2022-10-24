import * as functions from "firebase-functions";
import express = require('express');
import cors = require('cors');

const app = express();
// Automatically allow cross-origin requests
app.use(cors({origin: true}));
app.post('/image', express.raw({type: 'application/json'}), async (req: any, res) => {
  const {output, input, status} = req.body;
  console.log(output, input, status);
  res.sendStatus(200);
});


export const storeImage = functions.region("asia-southeast2").https.onRequest(app);
