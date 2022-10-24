import moment = require("moment-timezone");
import { db } from "../firebase";
import { animals } from "./ai_words/animals";
import { colors } from "./ai_words/colors";
import { commonWords } from "./ai_words/common_words";
import { pokemon } from "./ai_words/pokemon";
import { styles } from "./ai_words/styles";


export const hasReceivedImageInPastDay = async function hasReceivedImageInPastDay(uid: string) {
  const today = moment().startOf('day');
  const todayEnd = today.clone().endOf('day');
  const art = await db.art.where('userId', '==', uid).where('date', '<=', todayEnd).where('date', '>=', today).get();
  return art.size > 0;
};

const specificObjects = animals
  .concat(colors)
  .concat(commonWords)
  .concat(pokemon);

enum Tier {
  ONE = 0,
  TWO = 0.4,
  THREE = 0.7,
}

const artStyleCutProb = 0.2;

function getAIString() {
  const randomNum = Math.random();
  let tier = Tier.ONE;

  if (tier > Tier.THREE) {
    tier = Tier.THREE;
  } else if (tier > Tier.TWO) {
    tier = Tier.TWO;
  }

  let randomStr = '';

  // tier 1
  // choose 1 random specific object
  randomStr +=
    specificObjects[Math.floor(Math.random() * specificObjects.length)];

  // choose 1 common word
  randomStr += commonWords[Math.floor(Math.random() * commonWords.length)];

  // tier 2
  if (tier >= Tier.TWO) {
    // choose 1 more common word
    randomStr += commonWords[Math.floor(Math.random() * commonWords.length)];
  }

  // tier 3
  if (tier >= Tier.THREE) {
    // choose 1 more specific object
    randomStr +=
      specificObjects[Math.floor(Math.random() * specificObjects.length)];
  }

  // randomly decide if should add art style
  if (Math.random() <= artStyleCutProb) {
    randomStr += styles[Math.random()];
  }

  return randomStr;
}
