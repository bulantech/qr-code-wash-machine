//////////////////////////////////////////
//
//  แก้ตัวแปร:
//  1. databaseURL
//  2. storageBucket
//
//////////////////////////////////////////

// const functions = require("firebase-functions");
const admin = require('firebase-admin')
const initializeApp = admin.initializeApp({ 
  credential: admin.credential.applicationDefault() ,
  databaseURL: "https://xxx.firebasedatabase.app/",
  storageBucket: 'gs://xxx.appspot.com'
})
const firestore = admin.firestore()
const database = admin.database()
const bucket = admin.storage().bucket();

module.exports = {
  admin,
  initializeApp,
  firestore,
  database,
  bucket,
}