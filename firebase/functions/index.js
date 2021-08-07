const functions = require("firebase-functions");

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

const omise = require('./omise');
const line = require('./line');

exports.omiseHooks = omise.hooks;
exports.omiseChargesOnWrite = omise.chargesOnWrite;
exports.omiseChargesOnUpdate = omise.chargesOnUpdate;

exports.lineHooks = line.hooks;
exports.lineOnUpdate = line.onUpdate;

// exports.test = omise.test;
