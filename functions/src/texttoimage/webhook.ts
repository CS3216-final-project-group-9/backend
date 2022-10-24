import * as functions from "firebase-functions";
import express = require('express');
import cors = require('cors');
import {db} from "../firebase";
import {downloadImage, uploadImageToDb, uploadLocalFileToStorage} from "../utils/aiImage";

const app = express();
// Automatically allow cross-origin requests
app.use(cors({origin: true}));
app.post('/image', express.raw({type: 'application/json'}), async (req: any, res) => {
  const {output, id, status} = req.body;
  console.log(output, status, id);
  const hasSuceeded = status === "succeeded";
  if (!hasSuceeded) {
    res.sendStatus(400);
  }
  if (output.length === 0) {
    console.log(18);
    await db.art.doc(id).delete();
    res.sendStatus(200);
  }
  try {
    const imageUrl = output[0];
    const image = await downloadImage(imageUrl, id);
    const firebaseUrl = await uploadLocalFileToStorage(image.filePath, image.fileName);
    await uploadImageToDb(id, firebaseUrl);
    res.sendStatus(200);
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
});


export const storeImage = functions.region("asia-southeast2").https.onRequest(app);
