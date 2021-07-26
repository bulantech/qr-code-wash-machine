//////////////////////////////////////////
//
//  แก้ตัวแปร:
//  1. databaseURL
//  2. storageBucket
//  3. omiseSecretKey
//
//////////////////////////////////////////

const functions = require("firebase-functions");
const admin = require('firebase-admin')
admin.initializeApp({ 
  credential: admin.credential.applicationDefault() ,
  databaseURL: "https://YOUR_PROJECT.asia-southeast1.firebasedatabase.app/",
  storageBucket: 'gs://YOUR_PROJECT.appspot.com'
})
const firestore = admin.firestore()
const database = admin.database()
const bucket = admin.storage().bucket();

const { nanoid } = require('nanoid')
const fetch = require('node-fetch');

const mkdirp = require('mkdirp');
const path = require('path');
const os = require('os');
const fs = require('fs');

const sharp = require('sharp');

//omise SecretKey
const omiseSecretKey = "OMISE_SECRET_KEY"
const amountDefault = 20 //20 bath

// set image for lcd size
const lcdWidth = 240;
const lcdHigh = 320;

// ฟังชั่นรับค่า hook จาก omise เก็บไว้ใน firestore
exports.hooks = functions.https.onRequest( async (request, response) => {
  functions.logger.info("omise hooks", {structuredData: true});

  // Check for POST request
  if(request.method !== "POST"){
    response.status(400).send({error: "method !== POST", msg: null});
    return;
  }

  const d = new Date();
  // const id = d.toISOString()+'_'+request.body.key+'_'+nanoid(6); //ตั้ง id เป็นวันที่และ key ของ omise เป็อดูง่าย
  const id = request.body.data.source.id+'_'+request.body.key

  // add to events collectin
  const addDoc = await firestore.collection('omiseHooks')
    .doc(id).set( { ...request.body, stamp_at: d.toISOString(), timeStamp: admin.firestore.FieldValue.serverTimestamp() } )
    // .add( { ...request.body, timeStamp: admin.firestore.FieldValue.serverTimestamp() } )
    .then(ref => {
      // console.log('Added omiseHooks with ID: ', ref.id);
      console.log('Added omiseHooks OK!');
    });

  functions.logger.info("omise hooks => " + JSON.stringify(request.body), {structuredData: true});
  const body = request.body
  console.log('body.key =>', body.key)
  switch(body.key) {
    case 'charge.create':
      return response.send( {error: null, msg: "charge.create omise hooks OK!"} );
    break

    case 'charge.complete':
      const deviceID = body.data.description
      const failure_code = body.data.failure_code
      if(failure_code) {
        console.log('failure_message =>', body.data.failure_message)
        const chargeComplete  = await database.ref('chargeComplete/'+deviceID).set({
          error: failure_code, 
          amount: 0, 
          resDate: new Date().toISOString(), 
          download_uri: body.data.source.scannable_code.image.download_uri,
          id: body.data.source.id
        });
        return response.send( {error: null, msg: "charge.complete omise hooks OK! failure_code"} );
      }
      else {
        const amount = body.data.amount
        console.log('amount =>', amount)
        const chargeComplete  = await database.ref('chargeComplete/'+deviceID).set({
          error: 0, 
          amount: amount/100, 
          resDate: new Date().toISOString(), 
          download_uri: body.data.source.scannable_code.image.download_uri,
          id: body.data.source.id
        });
        return response.send( {error: null, msg: "charge.complete omise hooks OK!"} );
      }
    break
  }

});

exports.chargesOnWrite = functions.database.ref('/chargeCreate/{pushId}/reqDate').onWrite( async (change, context) => {
  console.log('chargesOnWrite ID:', context.params.pushId);
  // Only edit data when it is first created.
  if (change.before.exists()) {
    return null;
  }
  // Exit when the data is deleted.
  if (!change.after.exists()) {
    return null;
  }

  // Grab the current value of what was written to the Realtime Database.
  // const reqDate = change.after.val();
  // console.log('Uppercasing', context.params.pushId, reqDate);
  // const uri = reqDate.toUpperCase();

  // You must return a Promise when performing asynchronous tasks inside a Functions such as
  // writing to the Firebase Realtime Database.
  // Setting an "uppercase" sibling in the Realtime Database returns a Promise.
  // return change.after.ref.parent.child('download_uri').set(uri);

  const deviceID = context.params.pushId
  console.log('chargesOnWrite deviceID =>', deviceID);
  const amountSnapshot  = await database.ref('chargeAmount/'+deviceID+'/amount').once('value');
  let amount = amountSnapshot.val();
  console.log('amount =>', amount);
  // amount = (!amount)? amountDefault: amount+'00'
  if(!amount) {
    amount = amountDefault+'00'
    const writeAmount = await database.ref('chargeAmount/'+deviceID+'/amount').set(amountDefault);
  }
  else {
    amount = amount+'00'
  }

  await sendCharges(amount, deviceID)
    .then( async(resp) => {

      const url = resp.source.scannable_code.image.download_uri
      const id = resp.source.id

      const d = new Date()
        .toLocaleString('th', {year: 'numeric', month: '2-digit', day: '2-digit'})
        .replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$2-$1')

      const filePath = 'qrcode/'+d+'/'+id+'.svg'
      const tempLocalFile = path.join(os.tmpdir(), filePath);
      const tempLocalDir = path.dirname(tempLocalFile);

      const SVGFilePath = filePath
      const tempLocalSVGFile = path.join(os.tmpdir(), SVGFilePath);

      await mkdirp(tempLocalDir);

      const res = await fetch(url);
      const buffer = await res.buffer();
      console.log('tempLocalSVGFile =>', tempLocalSVGFile)
      
      fs.writeFileSync(tempLocalSVGFile, buffer)
      console.log('finished downloading!')

      
      const JPEGFilePath = 'qrcode/'+d+'/'+id+'.jpg'
      const tempLocalJPEGFile = path.join(os.tmpdir(), JPEGFilePath);
      console.log('tempLocalJPEGFile =>', tempLocalJPEGFile)

      const img = await sharp(tempLocalSVGFile);
      const resized = await img.resize({ width: lcdWidth, height: lcdHigh, fit: 'contain', });
      await resized.toFile(tempLocalJPEGFile);
      console.log('resized')

      // Uploading the JPEG image.    
      await bucket.upload(tempLocalJPEGFile, {destination: JPEGFilePath});
      functions.logger.log('JPEG image uploaded to Storage at', JPEGFilePath);

      const data = { qrcode: JPEGFilePath, id: resp.source.id, download_uri: resp.source.scannable_code.image.download_uri}
      console.log('update data =>', data);
      return await change.after.ref.parent.update(data);
    })
    .catch(err => { return functions.logger.error(err) } )

  // console.log('chargesOnUpdate finished');

});

exports.chargesOnUpdate = functions.database.ref('/chargeCreate/{pushId}/reqDate')
.onUpdate( async (change, context) => {
  console.log('chargesOnUpdate ID =>', context.params.pushId);

  // Exit when the data is deleted.
  if (!change.after.exists()) {
    functions.logger.warning("!change.after.exists()");
    return null;
  }

  const deviceID = context.params.pushId
  console.log('chargesOnUpdate deviceID =>', deviceID);
  const amountSnapshot  = await database.ref('chargeAmount/'+deviceID+'/amount').once('value');
  let amount = amountSnapshot.val();
  console.log('amount =>', amount);
  // amount = (!amount)? amountDefault: amount+'00'
  if(!amount) {
    amount = amountDefault+'00'
    const writeAmount = await database.ref('chargeAmount/'+deviceID+'/amount').set(amountDefault);
  }
  else {
    amount = amount+'00'
  }

  await sendCharges(amount, deviceID)
    .then( async(resp) => {

      const url = resp.source.scannable_code.image.download_uri
      const id = resp.source.id

      const d = new Date()
        .toLocaleString('th', {year: 'numeric', month: '2-digit', day: '2-digit'})
        .replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$2-$1')

      const filePath = 'qrcode/'+d+'/'+id+'.svg'
      const tempLocalFile = path.join(os.tmpdir(), filePath);
      const tempLocalDir = path.dirname(tempLocalFile);

      const SVGFilePath = filePath
      const tempLocalSVGFile = path.join(os.tmpdir(), SVGFilePath);

      await mkdirp(tempLocalDir);

      const res = await fetch(url);
      const buffer = await res.buffer();
      console.log('tempLocalSVGFile =>', tempLocalSVGFile)
      
      fs.writeFileSync(tempLocalSVGFile, buffer)
      console.log('finished downloading!')

      const resizewidth = 240;
      const JPEGFilePath = 'qrcode/'+d+'/'+id+'.jpg'
      const tempLocalJPEGFile = path.join(os.tmpdir(), JPEGFilePath);
      console.log('tempLocalJPEGFile =>', tempLocalJPEGFile)

      const img = await sharp(tempLocalSVGFile);
      const resized = await img.resize({ width: lcdWidth, height: lcdHigh, fit: 'contain', });
      await resized.toFile(tempLocalJPEGFile);
      console.log('resized')

      // Uploading the JPEG image.    
      await bucket.upload(tempLocalJPEGFile, {destination: JPEGFilePath});
      functions.logger.log('JPEG image uploaded to Storage at', JPEGFilePath);

      const data = { qrcode: JPEGFilePath, id: resp.source.id, download_uri: resp.source.scannable_code.image.download_uri}
      console.log('update data =>', data);
      return await change.after.ref.parent.update(data);
    })
    .catch(err => { return functions.logger.error(err) } )

  // console.log('chargesOnUpdate finished');

});

const sendCharges = (amount, id, cb) => {
  return new Promise((resolve, reject) => {
    // const amount = '2000' // 20 Baht
    var omise = require('omise')({
      'secretKey': omiseSecretKey,
      'omiseVersion': '2019-05-25'
    });
    omise.charges.create({
      'description': id,
      'amount': amount, 
      'currency': 'THB',
      // 'capture': false,
      'source': {
        'type': 'promptpay'
      }
    }, function(err, resp) {
      // console.log('err, resp =>', err, resp)
      if (err) {
        return reject(err)                  
      }
      if(resp.failure_code) {
        return reject(resp.failure_code)
      }
      
      resolve(resp)
     
    })
  });
}

exports.test = functions.https.onRequest( async (request, response) => {
  const amount="3500"
  const deviceID="id0000"
  await sendCharges(amount, deviceID)
    .then( async(resp) => {
      console.log('===== resp =>', resp)
      
      const url = resp.source.scannable_code.image.download_uri
      const id = resp.source.id

      const filePath = 'qrcode/'+id+'.svg'
      const tempLocalFile = path.join(os.tmpdir(), filePath);
      const tempLocalDir = path.dirname(tempLocalFile);

      const SVGFilePath = filePath
      const tempLocalSVGFile = path.join(os.tmpdir(), SVGFilePath);

      await mkdirp(tempLocalDir);

      const res = await fetch(url);
      const buffer = await res.buffer();
      console.log('tempLocalSVGFile =>', tempLocalSVGFile)
      
      fs.writeFileSync(tempLocalSVGFile, buffer)
      console.log('finished downloading!')

      const resizewidth = 240;
      const JPEGFilePath = 'qrcode/'+id+'.jpg'
      const tempLocalJPEGFile = path.join(os.tmpdir(), JPEGFilePath);
      console.log('tempLocalJPEGFile =>', tempLocalJPEGFile)

      const img = await sharp(tempLocalSVGFile);
      const resized = await img.resize(resizewidth);
      await resized.toFile(tempLocalJPEGFile);
      console.log('resized')

      // Uploading the JPEG image.    
      // await bucket.upload(tempLocalJPEGFile, {destination: JPEGFilePath});
      // functions.logger.log('JPEG image uploaded to Storage at', JPEGFilePath);

      // const data = { qrcode: JPEGFilePath, id: resp.source.id, download_uri: resp.source.scannable_code.image.download_uri}
      // console.log('data =>', data);
      // return await change.after.ref.parent.update(data);

      response.send({error: null, msg: "resp"});
    })
    .catch(err => { 
      functions.logger.error(err)
      response.send({error: true, msg: err});
    })
    
  console.log('chargesOnUpdate finished');

});