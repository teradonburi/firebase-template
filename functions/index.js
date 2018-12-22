'use strict'

const functions = require('firebase-functions')
const admin = require('firebase-admin')
const serviceAccount = require('./secret.json')
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://fir-template-11d18.firebaseio.com/',
  storageBucket: 'fir-template-11d18.appspot.com',
})
const database = admin.database()
const storage = admin.storage()
const bucket = storage.bucket()

const express = require('express')
const cors = require('cors')({origin: true})
const app = express()

const validate = async (req, res, next) => {

  if ((!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) &&
      !(req.cookies && req.cookies.__session)) {
    return res.status(403).send('Unauthorized')
  }

  let idToken
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    // ID Tokenをthe Authorization headerから取得
    idToken = req.headers.authorization.split('Bearer ')[1]
  } else {
    // 認証失敗
    return res.status(403).send('Unauthorized')
  }

  try {
    const decodedIdToken = await admin.auth().verifyIdToken(idToken)
    console.log('ID Token correctly decoded', decodedIdToken)
    // ID Token decodedreq.userに格納
    req.user = decodedIdToken
    return next()
  } catch (error) {
    console.error('Error while verifying Firebase ID token:', error)
    return res.status(403).send('Unauthorized')
  }
}

app.use(cors)

async function ping(req, res) {
  res.send('ok')
}

async function info(req, res) {
  const id = req.user.uid
  const msg = req.body.msg
  if (!msg) return res.status(400).json()
  // pathで格納される
  await database.ref(`/blog/${id}`).set(msg)
  // path以下の子がすべて取れる
  const result = await database.ref(`/blog/${id}`).once('value').then((snapshot) => snapshot.val())
  res.json(result)
}

async function addFilePermission(req, res) {
  const path = req.body.path
  const fileRef = bucket.file(path)
  let result = await fileRef.getMetadata()
  console.log(result)
  const data = {
    metadata: {},
  }
  data.metadata[req.user.uid] = true
  result = await fileRef.setMetadata(data)
  console.log(result)

  res.json({message: 'success'})
}

// 認証なしAPI
app.get('/', ping)

app.use(
  '/user',
  express.Router()
    // ユーザ認証付きAPI
    // `Authorization` HTTP headerに`Bearer <Firebase ID Token>`が必須
    .post('/info', validate, info)
    .post('/permission', validate, addFilePermission)
)

// それ以外
app.all('*', (req, res) => {
  res.status(404).send('not found')
})

exports.api = functions.https.onRequest(app)
