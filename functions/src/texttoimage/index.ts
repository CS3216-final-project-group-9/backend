import * as functions from "firebase-functions";
import axiosObj = require("axios");
const API_KEY = "";
const url = "https://api.replicate.com/v1/predictions";
const webhook = "https://asia-southeast2-cs3216-final-group-9.cloudfunctions.net/storeImage";

async function textToImage(prompts: string[]) {
  const inputString = prompts.join(' ');
  const axios = axiosObj as any;
  const {data} = await axios.post(
      url,
      {
        input: {
          prompt: inputString,
        },
        version: "cc201941f43a4b6299d31f28a9745f2c33523b9d78a92cf7261fcab3fc36fd37",
        webhook_completed: webhook,
      },
      {
        headers: {
          'Authorization': 'Token ' + API_KEY,
          'Content-Type': 'application/json',
        },
      }
  );
  console.log(26);
  console.log(JSON.stringify(data));
}


export const getImage = functions.region("asia-southeast2").pubsub.schedule("45 13 * * *").timeZone("Asia/Singapore").onRun(() => {
  console.log('getimage called');
  const prompts = ['Skyline', 'At', 'New', 'York'];
  return textToImage(prompts);
});
