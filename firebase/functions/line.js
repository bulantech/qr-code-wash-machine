//////////////////////////////////////////
//
//  แก้ตัวแปร:
//  1. CHANNEL_ACCESS_TOKEN
//  2. CHANNEL_SECRET
//
//////////////////////////////////////////

// firebase
const functions = require('firebase-functions');
// const admin = require('firebase-admin')
// admin.initializeApp({ credential: admin.credential.applicationDefault() })
// const firestore = admin.firestore()
const { admin, firestore, database } = require('./firebase-admin');

// express
const async = require('async');
const express = require('express');
const cors = require('cors');
const app = express();

const fetch = require('node-fetch');

// line messaging api
const line = require('@line/bot-sdk');
const CHANNEL_ACCESS_TOKEN = ''
const CHANNEL_SECRET = ''

// const DIALOGFLOW_WEBHOOKS = [
//   'https://dialogflow.cloud.google.com/v1/integrations/line/webhook/848379e1-df9a-4297-b0cd-96039ddfb911',
// ]

const config = {
  channelAccessToken: CHANNEL_ACCESS_TOKEN,
  channelSecret: CHANNEL_SECRET
};

const client = new line.Client(config);

const message = {
  type: 'text',
  text: 'Hello World!'
};

const lineAlertHeader = 'LineAlert'


// Automatically allow cross-origin requests
app.use(cors({ origin: true }));


// build multiple CRUD interfaces:
app.get('/', (req, res) => {
  res.send('Hello GET line webhook 1')
});

app.post('/', async (req, res) => {
  console.log('lineWebhook req.body =>', JSON.stringify(req.body))
  const body = req.body

  if(!body.events) {
    functions.logger.error('!body.events')
    return res.send({error:"!body.events"})
  }

  if(!body.events.length) {
    functions.logger.error('!body.events.length')
    return res.send({error:"!body.events.length"})
  }

  checkEventMsg(body.events)

  const result = await fetchDialogflow(body)
  res.send(result)

  // webhookEvent(req.body, (error, msg) => {
  //   if(error) {
  //     functions.logger.error('webhookEvent error =>', error)
  //     return res.send(400, error)
  //   }
  //   res.send(msg)    
  // }) 
  // res.send('Hello POST')

});

// app.put('/', (req, res) => {
//   res.send('Hello PUT')
// });
// app.patch('/', (req, res) => {
//   res.send('Hello PATCH ')
// });
// app.delete('/', (req, res) => {
//   res.send('Hello DELETE')
// });



exports.onUpdate = functions.database.ref('/lineAlert/{pushId}/send').onUpdate( async (change, context) => {
  console.log('lineAlert onUpdate ID =>', context.params.pushId);

  // Exit when the data is deleted.
  if (!change.after.exists()) {
    functions.logger.warn("!change.after.exists()");
    return null;
  }

  const send = change.after.val();
  console.log('send =>', send)
  if(!send) {
    functions.logger.warn("!send");
    return null;
  }

  const userIdSnapshot = await change.after.ref.parent.child('user').once('value');
  const userId = userIdSnapshot.val();
  console.log('userId =>', userId)
  const messageSnapshot  = await database.ref('lineAlertText/text').once('value');
  const message = messageSnapshot.val();
  console.log('message =>', message)
  const res = await client.pushMessage(userId, { type: 'text', text: message });
  console.log('pushMessage')
  return await change.after.ref.parent.child('sendOK').set(1);

});



checkEventMsg = (events) => {
  console.log('checkEventMsg ...');
  events.forEach( async event => {
    switch(event.type) {
      case 'follow':
        {
        console.log('follow =>', event);
        const userId = event.source.userId
        const replyToken = event.replyToken
        const docRef = firestore.collection('lineUsers').doc(userId)
        const getDoc = await docRef.get()
          .then(doc => {
            if (doc.exists) {
              // console.log('Document data:', doc.data());
              const status = 'refollow'
              updateUser(userId, event, status)

              // replyMessage(replyToken, message)
              // pushMessage(userId, message, (err) => {
              //   callback()
              // })
              
            } else {
              // console.log('No such document!');
              const status = 'follow'
              setUser(userId, event, status)

              // pushMessage(userId, message, (err) => {
              //   callback()
              // })
            }
          })
          .catch(err => {
            functions.logger.error('Error getting document', err);

          });
        }
      break
      case 'unfollow':
        {
        // console.log('unfollow =>', event);
        const userId = event.source.userId
        const docRef = firestore.collection('lineUsers').doc(userId)
        const getDoc = await docRef.get()
          .then(doc => {
            if (doc.exists) {
              console.log('Document data:', doc.data());
              updateUser(userId, event, 'unfollow')
            } else {
              console.log('No such document!');
              setUser(userId, event, 'unfollow')
            }
          })
          .catch(err => {
            functions.logger.error('Error getting document', err);

          });
        }
      break
      case 'message':
      {
        // console.log('message =>', event);
        if(event.message.type != 'text') break

        const userId = event.source.userId    
        // LineAlert<DEVICE_ID>      
        const msg = event.message.text 
        const msgSplit = msg.split(lineAlertHeader)
        if(msgSplit.length != 2) break

        const deviceID = msgSplit[1]
        const d = new Date()
          .toLocaleString('th', {year: 'numeric', month: '2-digit', day: '2-digit'})
          .replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$2-$1')
        const data = {user: userId, send: 0, date: d}
        const writeCount = await database.ref('lineAlert/'+deviceID).set(data);
      }
      break
      default:
        // console.log('default event =>', event);
      break
    }
  });
}


fetchDialogflow = async (body) => {
  console.log('fetchDialogflow ...');
  let webhooks = []
  let webhooksCount = 0

  const dialogflowSnapshot  = await database.ref('Dialogflow').once('value');
  let dialogflowObj = dialogflowSnapshot.val();
  // console.log('dialogflowObj =>', dialogflowObj);

  if(!dialogflowObj) return functions.logger.error("Dialogflow is empty!")

  const hooksObj = dialogflowObj.WebhookURL
  if(!hooksObj) return functions.logger.error("Dialogflow hook is empty!")

  for (const key in hooksObj) { 
    // console.log( 'key, value =>', key, hooksObj[key] );
    webhooks.push( hooksObj[key] )
  }
  // console.log( 'webhooks =>', webhooks);

  let count = dialogflowObj.count
  // console.log('count =>', count);
  if(count == null) {
    count = 0
    const writeCount = await database.ref('Dialogflow/count').set(count);
  }
  else {
    if(count >= webhooks.length) count = 0
    webhooksCount = count 
    if(++count >= webhooks.length) count = 0
    const writeCount = await database.ref('Dialogflow/count').set(count);
  }
  // console.log( 'Use webhooksCount, webhooks[webhooksCount] =>', webhooksCount, webhooks[webhooksCount]);
  
  let jsonRes = {}
  await fetch(webhooks[webhooksCount], {
      method: 'post',
      body:    JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    })
    .then(res => res.json())
    .then(json => { 
      // console.log(json) 
      jsonRes = json
    });

  return jsonRes
}

webhookEvent = async (body, callback) => {
  const events = body.events
  let allError = []

  // const userId = events[0].source.userId
  // client.pushMessage(userId, {
  //   type: 'text',
  //   text: 'Hello World-'+Date.now()
  // });
  // pushMessage(userId, {
  //   type: 'text',
  //   text: 'Hello World-'+Date.now()
  // })
  // setTimeout( () => callback(null, ''), 2000)

  // return

  // add to events collectin  
  // const addDoc = await firestore.collection('lineHooks').add(body).then(ref => {
  //   console.log('Added document with ID: ', ref.id);
  // });

  // const d = new Date();
  // const addDoc = await firestore.collection('lineHooks').add({ ...body, stamp_at: d.toISOString(), timeStamp: admin.firestore.FieldValue.serverTimestamp()}).then(ref => {
  //   console.log('Added document with ID: ', ref.id);
  // });

  // create a queue object with concurrency 2
  var q = async.queue(function(event, callback) {
    switch(event.type) {
      case 'follow':
        {
        console.log('follow =>', event);
        const userId = event.source.userId
        const replyToken = event.replyToken
        const docRef = firestore.collection('lineUsers').doc(userId)
        let getDoc = docRef.get()
          .then(doc => {
            if (doc.exists) {
              console.log('Document data:', doc.data());
              const status = 'refollow'
              updateUser(userId, event, status)
              callback()
              // replyMessage(replyToken, message)
              // pushMessage(userId, message, (err) => {
              //   callback()
              // })
              
            } else {
              console.log('No such document!');
              const status = 'follow'
              setUser(userId, event, status)
              callback()
              // pushMessage(userId, message, (err) => {
              //   callback()
              // })
            }
          })
          .catch(err => {
            console.log('Error getting document', err);
            allError.push(error)
            callback()
          });
        }
      break
      case 'unfollow':
        {
        console.log('unfollow =>', event);
        const userId = event.source.userId
        const docRef = firestore.collection('lineUsers').doc(userId)
        let getDoc = docRef.get()
          .then(doc => {
            if (doc.exists) {
              console.log('Document data:', doc.data());
              updateUser(userId, event, 'unfollow')
              callback()
            } else {
              console.log('No such document!');
              setUser(userId, event, 'unfollow')
              callback()
            }
          })
          .catch(err => {
            console.log('Error getting document', err);
            allError.push(error)
            callback()
          });
        }
      break
      case 'message':
        {
        console.log('message =>', event);
        const userId = event.source.userId
        const docRef = firestore.collection('lineUsers').doc(userId)
        let getDoc = docRef.get()
          .then(doc => {
            if (doc.exists) {
              console.log('Document data:', doc.data());
              updateUser(userId, event, 'refollow-message')
              callback()
            } else {
              console.log('No such document!');
              setUser(userId, event, 'follow-message')
              callback()
            }
          })
          .catch(err => {
            console.log('Error getting document', err);
            allError.push(error)
            callback()
          });
        }
      break
      default:
        console.log('event =>', event);
        callback()
      break
    }
    // callback();
  }, 10);

  // assign a callback
  q.drain( function(error) {
    console.log('All items have been processed');
    if(error) {
      return callback({error: error}, null)
    }
    if(allError.length) {
      return callback({error: allError}, null)
    }
    callback(null, 'All items have been processed')
  })

  // add some items to the queue (batch-wise)
  q.push(events, function(err) {
    console.log('Finished push item');
  });
   
}

// users firestore ======================================
updateUser = (userId, event, status) => {  
  const docRef = firestore.collection('lineUsers').doc(userId)
  const data = {
    id: userId,
    event: event,
    lastUpdate: Date.now(),
    status: status
  } 
  let updateDoc = docRef.update(data)
}

setUser = (userId, event, status) => {  
  const docRef = firestore.collection('lineUsers').doc(userId)
  const data = {
    id: userId,
    event: event,
    lastUpdate: Date.now(),
    status: status
  }
  let setDoc = docRef.set(data)
}

// Line messaging api ======================================
replyMessage = (replyToken, message) => {
  console.log('replyMessage...',replyToken, message);  

}

pushMessage = (userId, message) => {
  console.log('pushMessage...', userId, message);    
  client.pushMessage(userId, message);
}

// End Line messaging api ======================================


// Expose Express API as a single Cloud Function:
exports.hooks = functions.https.onRequest(app);



// lineWebhook req.body => {"events":[{"type":"unfollow","source":{"userId":"U9ce24b9c29f1aa06ba87f3be1ac8c099","type":"user"},"timestamp":1584952902480,"mode":"active"}],"destination":"U3b15f3d307523422cf893f231301d9fe"}

// lineWebhook req.body => {"events":[{"type":"follow","replyToken":"be9d12511d6f48ba9b6a6e28f4a01162","source":{"userId":"U9ce24b9c29f1aa06ba87f3be1ac8c099","type":"user"},"timestamp":1584952955731,"mode":"active"}],"destination":"U3b15f3d307523422cf893f231301d9fe"}

// lineWebhook req.body => {"events":[{"type":"follow","replyToken":"c47dfc87f8d744158c110a34901ebef6","source":{"userId":"Ua39f5ee39df70b5411dfbdd666471324","type":"user"},"timestamp":1584953059242,"mode":"active"}],"destination":"U3b15f3d307523422cf893f231301d9fe"}

// lineWebhook req.body => {"events":[{"type":"message","replyToken":"f8c4817fe4ad423c88862ccd282e77be","source":{"userId":"Ua39f5ee39df70b5411dfbdd666471324","type":"user"},"timestamp":1584953439280,"mode":"active","message":{"type":"text","id":"11649949774145","text":"Hello"}}],"destination":"U3b15f3d307523422cf893f231301d9fe"}
