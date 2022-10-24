import moment = require("moment-timezone")
import {db, storage} from "../firebase";
import axiosObj = require("axios");
import path = require("path");
import os = require("os");
import fs = require('fs');

export const hasReceivedImageInPastDay = async function hasReceivedImageInPastDay(uid: string) {
  const today = moment().startOf('day');
  const todayEnd = today.clone().endOf('day');
  const art = await db.art.where('userId', '==', uid).where('date', '<=', todayEnd).where('date', '>=', today).get();
  return art.size > 0;
};


/**
 * @param {String} fileUrl
 * @param {String} fileName
 */
export const downloadImage = async function downloadImage(fileUrl: string, fileName: string) {
  const axios = axiosObj as any;
  const fileExt = ".png";
  const fileNameWithExt = fileName + fileExt;
  const tempFilePath = path.join(os.tmpdir(), (fileNameWithExt));
  const writer = fs.createWriteStream(tempFilePath);
  return axios({
    method: 'get',
    url: fileUrl,
    responseType: 'stream',
  }).then((response: any) => {
    // Wait for another promise to write the file completely into disk
    return new Promise((resolve) => {
      response.data.pipe(writer);
      let error = '';
      writer.on('error', (err) => {
        error = err.message;
        writer.close();
        throw new Error(error);
      });
      writer.on('close', () => {
        if (!error) {
          resolve({
            "filePath": tempFilePath,
            "fileName": fileNameWithExt,
          });
        }
      });
    });
  });
};

/**
 * Upload the file in firestore storage
 * @param {String} filePath
 * @param {String} fileName
 */
export const uploadLocalFileToStorage = async function uploadLocalFileToStorage(filePath: string, fileName: string) {
  const imageBucket = "aiImages/";
  const bucket = storage;
  const destination = `${imageBucket}${fileName}`;
  try {
    // Uploads a local file to the bucket
    await bucket.upload(filePath, {
      destination: destination,
      gzip: true,
      metadata: {
        cacheControl: 'public, max-age=31536000',
      },
    });
    const bucketName = storage.name;
    const url = `https://storage.googleapis.com/${bucketName}/aiImages/${fileName}`;
    console.log(72, url);
    return url;
  } catch (e) {
    console.error(e);
    throw new Error("uploadLocalFileToStorage failed: " + e);
  }
};

export const uploadImageToDb = async function uploadImageToDb(id: string, url: string) {
  const ref = db.art.doc(id);
  return ref.update({image: url});
};
