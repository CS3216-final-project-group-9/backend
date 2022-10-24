import * as functions from "firebase-functions";
import axiosObj = require("axios");
import {AIImageTrigger} from "../type/ImageTrigger";
import {FirestoreCustomArt} from "../type/firebase-type";
import {db} from "../firebase";
import {getInputStringForAi, hasReceivedImageInPastDay} from "./util";

const url = "https://api.replicate.com/v1/predictions";
const webhook = "https://asia-southeast2-cs3216-final-group-9.cloudfunctions.net/storeImage/image";
const MODEL_VERSION = "cc201941f43a4b6299d31f28a9745f2c33523b9d78a92cf7261fcab3fc36fd37";
const config = functions.config();
const API_KEY =config.replicate.key;

/**
 * Returns true if image will be generated for this trigger
 * Randomized to gamify it (you dont always get an image)
 * For now, always return true since userbase is small
 * @return {boolean}
 */
function willGetImage() {
  return true;
}

export const generateImage = async function generateImage(userId: string, trigger: AIImageTrigger, source: string, milestone?: number) {
  console.log(25);
  const hasBeenAwarded = await hasReceivedImageInPastDay(userId);
  if (hasBeenAwarded) {
    console.log(28);
    return Promise.resolve();
  }
  console.log(30);
  const toProceed = willGetImage();
  if (!toProceed) {
    console.log(34);
    return Promise.resolve();
  }
  const prompt = getInputStringForAi();
  return textToImage(prompt, userId, trigger, source, milestone);
};

async function textToImage(prompt: string, userId: string, trigger: AIImageTrigger, source: string, milestone?: number) {
  const artObject: FirestoreCustomArt = {
    prompt,
    userId,
    trigger,
    source,
    date: new Date(),
  };
  if (milestone !== undefined) {
    artObject.milestone = milestone;
  }
  const axios = axiosObj as any;
  console.log(53);
  try {
    const {data} = await axios.post(
        url,
        {
          input: {
            prompt,
            width: 512,
            height: 256,
            num_inference_steps: 301,
          },
          version: MODEL_VERSION,
          webhook_completed: webhook,
        },
        {
          headers: {
            'Authorization': 'Token ' + API_KEY,
            'Content-Type': 'application/json',
          },
        }
    );
    const {id, status} = data;
    const hasFailed = status === 'failed' || status === 'canceled';
    if (hasFailed) {
      console.log(76);
      return Promise.resolve();
    }
    console.log(79);
    const ref = db.art.doc(id);
    return ref.set(artObject);
  } catch {
    return;
  }
}
