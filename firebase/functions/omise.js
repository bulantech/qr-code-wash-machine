const functions = require("firebase-functions");
const admin = require('firebase-admin')
admin.initializeApp({ 
  credential: admin.credential.applicationDefault() ,
  databaseURL: "https://qr-code-wash-machine-default-rtdb.asia-southeast1.firebasedatabase.app/"
})
const firestore = admin.firestore()
const database = admin.database()

const { nanoid } = require('nanoid')

//omise SecretKey
const omiseSecretKey = ""
const amountDefault = '2000' //20 bath

// ฟังชั่นรับค่า hook จาก omise เก็บไว้ใน firestore
exports.hooks = functions.https.onRequest( async (request, response) => {
  functions.logger.info("omise hooks", {structuredData: true});

  // Check for POST request
  if(request.method !== "POST"){
    response.status(400).send({error: "method !== POST", msg: null});
    return;
  }

  const d = new Date();
  const id = d.toISOString()+'_'+request.body.key+'_'+nanoid(6); //ตั้ง id เป็นวันที่และ key ของ omise เป็อดูง่าย

  // add to events collectin
  const addDoc = await firestore.collection('omiseHooks')
    .doc(id).set( { ...request.body, timeStamp: admin.firestore.FieldValue.serverTimestamp() } )
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
    break

    case 'charge.complete':
      const deviceID = body.data.description
      const failure_code = body.data.failure_code
      if(failure_code) {
        console.log('failure_message =>', body.data.failure_message)
        const chargeComplete  = await database.ref('chargeComplete/'+deviceID).set({error: failure_code, amount: 0, resDate: new Date().toISOString()});
      }
      else {
        const amount = body.data.amount
        console.log('amount =>', amount)
        const chargeComplete  = await database.ref('chargeComplete/'+deviceID).set({error: 0, amount: amount/100, resDate: new Date().toISOString()});
      }
    break
  }

  response.send( {error: null, msg: "omise hooks OK!"} );
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
  console.log('chargesOnUpdate deviceID =>', deviceID);
  const amountSnapshot  = await database.ref('chargeAmount/'+deviceID+'/amount').once('value');
  let amount = amountSnapshot.val();
  console.log('amount =>', amount);
  amount = (!amount)? amountDefault: amount+'00'
  // const uri = new Date().toUTCString()
  // return change.after.ref.parent.child('download_uri').set(uri);

  return sendCharges(amount, deviceID, (error, resp)=>{
    if(error) 
      return functions.logger.error("sendCharges error => " + error); 

    const uri = resp.source.scannable_code.image.download_uri
    console.log('download_uri =>', uri);
    return change.after.ref.parent.child('download_uri').set(uri);
  })

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
  amount = (!amount)? amountDefault: amount+'00'
  // const uri = new Date().toUTCString()
  // return change.after.ref.parent.child('download_uri').set(uri);

  return sendCharges(amount, deviceID, (error, resp)=>{
    if(error) 
      return functions.logger.error("sendCharges error => " + error); 

    const uri = resp.source.scannable_code.image.download_uri
    console.log('download_uri =>', uri);
    return change.after.ref.parent.child('download_uri').set(uri);
  })

});

const sendCharges = (amount, id, cb) => {
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
    if (resp.paid) {
      //Success
      cb(null, resp)
    } else {
      //Handle failure
      // throw resp.failure_code;
      cb(resp.failure_code, resp)
    }
  });
}

// exports.testCharges = functions.https.onRequest((request, response) => {
//   sendCharges('2000', 'id1234', (error, resp)=>{
//     if(error) return response.status(400).send({error: error, msg: null});

//     response.send({error: null, msg: resp});
//   })

// });