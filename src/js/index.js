/*globals module: false process: false */
import 'firebase'
import React  from 'react'
import ReactDOM from 'react-dom'
import { AppContainer } from 'react-hot-loader'
import { combineReducers, createStore, applyMiddleware, compose } from 'redux'
import { Provider } from 'react-redux'
import createHistory from 'history/createBrowserHistory'
import thunk from 'redux-thunk'
import axios from 'axios'
import { reducer as formReducer } from 'redux-form'
import { Route, Switch } from 'react-router-dom'
import { ConnectedRouter, connectRouter, routerMiddleware } from 'connected-react-router'
import { MuiThemeProvider } from '@material-ui/core/styles'
import { createMuiTheme } from '@material-ui/core/styles'

// mui theme
const theme = createMuiTheme({
  typography: {
    useNextVariants: true,
  }}
)

const client = axios.create()

// redux-devtoolの設定
const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose
// ブラウザ履歴保存用のストレージを作成
const history = createHistory()
// axiosをthunkの追加引数に加える
const thunkWithClient = thunk.withExtraArgument(client)


const LOGIN = 'user/LOGIN'
const INFO = 'user/INFO'
const CHAT = 'user/CHAT'

function userReducer(state = {uid: null, token: null, info: '', chats: []}, action = {}) {
  switch (action.type) {
    case LOGIN:
      return {
        ...state,
        uid: action.data.uid,
        token: action.data.token,
      }
    case INFO:
      return {
        ...state,
        info: action.info,
      }
    case CHAT:
      return {
        ...state,
        chats: action.chats,
      }
    default:
      return state
  }
}

// reducer
const reducer = combineReducers({
  router: connectRouter(history),
  form: formReducer,
  userReducer,
})

// redux-thunkをミドルウェアに適用、historyをミドルウェアに追加
const store = createStore(connectRouter(history)(reducer), {}, composeEnhancers(applyMiddleware(routerMiddleware(history), thunkWithClient)))


import { connect } from 'react-redux'
import { upload, download, signIn, signOut, authChange, apiEndpoint, pushData, receiveData } from './lib/firebase'


authChange(({uid, token}) => {
  if (token) {
    const url = apiEndpoint + '/api/user/login'
    fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token,
      },
    })
      .then(() => store.dispatch({type: LOGIN, data: {uid, token}}))
      .catch(error => {
        console.error(error)
        store.dispatch({type: LOGIN, data: {uid: null, token: null}})
      })
  } else {
    store.dispatch({type: LOGIN, data: {uid: null, token: null}})
  }
})

client.interceptors.request.use(req => {
  const token = store.getState().userReducer.token

  if (token) {
    // ieのリクエストキャッシュ対策
    document.execCommand && document.execCommand('ClearAuthenticationCache', 'false')
    req.url += (req.url.indexOf('?') == -1 ? '?' : '&') + '_=' + Date.now()
    // ユーザ認証トークン付与
    req.headers.Authorization = `Bearer ${token}`
  }
  return req
}, err => Promise.reject(err))

client.interceptors.response.use(res => res, err => {
  if (axios.isCancel(err)) {
    return Promise.reject({code: 999, message: 'cancel'})
  }
  return Promise.reject(err.response || {})
})

function sendInfo(msg) {
  return (dispatch, getState, client) => {
    return client
      .post(apiEndpoint + '/api/user/info', msg)
      .then(res => res.data)
      .then(info => {
        dispatch({type: INFO, info})
        return info
      })
  }
}

function sendChat(msg) {
  return () => {
    return new Promise(() => {
      pushData('/chat', msg)
    })
  }
}

function getFilePermission(path) {
  return (dispatch, getState, client) => {
    return client
      .post(apiEndpoint + '/api/user/permission', path)
  }
}

receiveData('/chat', (chats) => {
  store.dispatch({type: CHAT, chats})
})



const TopPage = connect(
  state => ({
    uid: state.userReducer.uid,
    info: state.userReducer.info,
    chats: state.userReducer.chats,
  }),
  { sendInfo, sendChat, getFilePermission }
)(({uid, info, chats, sendInfo, sendChat, getFilePermission}) => (
  <div>
    {uid === null ?
      <button onClick={() => signIn()}>Sign in with Google</button> :
      <button onClick={() => signOut()}>Sign out</button>
    }
    {uid && <button onClick={() => sendInfo({msg: 'hoge'})}>info送信</button>}
    <div>{info}</div>
    <button onClick={() => sendChat({msg: 'ほげ'})}>チャット送信</button>
    {Object.keys(chats).map(key => <div key={key}>{chats[key].msg}</div>)}
    <input type="file" id="files" name="files[]" multiple onChange={(e) => {
      const files = e.target.files // FileList object
      for (let file of files) {
        upload(file, `/private/${uid}/${file.name}`)
      }
    }}/>
    <img src={require('../img/logo.png')} width={100} height={100} />
    <div style={{backgroundImage: `url('${require('../img/logo.png')}')`}} >aaa</div>
    <input type="text" onChange={(e) => this.setStete({filename: e.target.value})}/>
    <a id='download' href="#" onClick={(e) => {
      e.preventDefault()
      const file = 'private/lKiIqbceCSRx5eM9YUV5QAfQKtf2/fall.mp3'
      download(file).then(({url, blob}) => {

        if (window.navigator.msSaveBlob) {
          window.navigator.msSaveBlob(blob, file)

          // msSaveOrOpenBlobの場合はファイルを保存せずに開ける
          window.navigator.msSaveOrOpenBlob(blob, file)
        } else {
          const blobUrl = window.webkitURL.createObjectURL(blob)
          const link = document.createElement('a')
          link.download = url
          link.href = url
          link.click()
          // const audio = document.getElementById('audio')
          // audio.src = url
          window.URL.revokeObjectURL(blobUrl)
        }
      })
    }}>ダウンロード</a>
    <button onClick={() => getFilePermission({path: 'private/lKiIqbceCSRx5eM9YUV5QAfQKtf2/fall.mp3'})}>アクセス権取得</button>
    {/* <audio id="audio" controls /> */}
  </div>
))
const NotFound = () => <div>Not found</div>


const App = ({history}) => (
  <ConnectedRouter history={history}>
    <Switch>
      <Route exact path='/' component={TopPage} />
      <Route component={NotFound} />
    </Switch>
  </ConnectedRouter>
)

ReactDOM.render(
  <AppContainer>
    <MuiThemeProvider theme={theme}>
      <Provider store={store}>
        <App history={history} />
      </Provider>
    </MuiThemeProvider>
  </AppContainer>,
  document.getElementById('root'),
)