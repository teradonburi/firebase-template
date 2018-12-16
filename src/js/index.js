/*globals module: false process: false */
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

// reducer
const reducer = combineReducers({
  router: connectRouter(history),
  form: formReducer,
})

// redux-thunkをミドルウェアに適用、historyをミドルウェアに追加
const store = createStore(connectRouter(history)(reducer), {}, composeEnhancers(applyMiddleware(routerMiddleware(history), thunkWithClient)))

const TopPage = () => <div>Hello World!!</div>
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