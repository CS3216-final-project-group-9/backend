import * as functions from "firebase-functions";
import axiosObj = require("axios");
import {AIImageTrigger} from "../type/ImageTrigger";
const url = "https://api.replicate.com/v1/predictions";
const webhook = "https://asia-southeast2-cs3216-final-group-9.cloudfunctions.net/storeImage/image";
const MODEL_VERSION = "cc201941f43a4b6299d31f28a9745f2c33523b9d78a92cf7261fcab3fc36fd37";
const config = functions.config();
const API_KEY =config.replicate.key;

async function textToImage(prompt: string, userId: string, trigger: AIImageTrigger, source: string) {
  const axios = axiosObj as any;
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
}


export const getImage = functions.region("asia-southeast2").pubsub.schedule("55 15 * * *").timeZone("Asia/Singapore").onRun(() => {
  console.log('getimage called');
  const prompts = 'Beautiful digital matte painting skyline at new york';
  return textToImage(prompts);
});
