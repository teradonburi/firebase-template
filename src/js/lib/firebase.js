import firebase from 'firebase'

// プロジェクト別に違う
const config = {
  apiKey: 'AIzaSyBD8dyACq01J3Mus9jM9aNtoNK8ShcmMFI',
  authDomain: 'fir-template-11d18.firebaseapp.com',
  databaseURL: 'https://fir-template-11d18.firebaseio.com',
  projectId: 'fir-template-11d18',
  storageBucket: 'fir-template-11d18.appspot.com',
  messagingSenderId: '745807609589',
}
firebase.initializeApp(config)

const auth = firebase.auth()
const database = firebase.database()
const storage = firebase.storage()

// apiのエンドポイント
export const apiEndpoint = document.location.hostname === 'localhost' ?
  `http://localhost:5001/${config.projectId}/us-central1` :
  `https://us-central1-${config.projectId}.cloudfunctions.net`


export function signIn() {
  // Googleログイン
  auth.signInWithPopup(new firebase.auth.GoogleAuthProvider())
}

export function signOut() {
  auth.signOut()
}

export function authChange(callback) {
  auth.onAuthStateChanged((user) => {
    if (user) {
      // ログイン時にAuthorization Headerにtokenを付与
      firebase.auth().currentUser.getIdToken().then((token) => {
        callback({uid: user.uid, token})
      })
    } else {
      // ログアウト
      callback({uid: null, token: null})
    }
  })
}


export const setData = (path, data) => {
  database.ref(path).set(data)
}

export const pushData = (path, data) => {
  database.ref(path).push().set(data)
}

export const updateData = (path, data) => {
  database.ref(path).update(data)
}

export const removeData = (path) => {
  database.ref(path).remove()
}

export const receiveData = (path, callback) => {
  database.ref(path).on('value', (snapshot) => {
    callback(snapshot.val())
  })
}


export const upload = (file, path) => {
  // ルートフォルダの参照
  const rootRef = storage.ref()
  // パスへの参照
  const targetRef = rootRef.child(path)
  targetRef.put(file)
}

export const download = (path) => {
  // ルートフォルダの参照
  const rootRef = storage.ref()
  // パスへの参照
  const targetRef = rootRef.child(path)

  return targetRef.getDownloadURL().then((url) => {

    // データのBlob取得
    return fetch(new Request(url))
      .then((response) => response.blob())
      .then((blob) => ({url, blob}))

  }).catch((error) => {
    // 全エラーコードの一覧
    // https://firebase.google.com/docs/storage/web/handle-errors
    switch (error.code) {
      case 'storage/object-not-found':
        // ファイルがない
        break
      case 'storage/unauthorized':
        // ユーザのファイルへのアクセス権がない
        break
      case 'storage/canceled':
        // ユーザがアップロードをキャンセルした
        break
      case 'storage/unknown':
        // 不明なエラー、サーバ側の問題の可能性あり
        break
    }
  })
}

