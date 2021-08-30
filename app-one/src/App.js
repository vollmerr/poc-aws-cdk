import {
  BrowserRouter,
  Switch,
  Route,
  Link,
  HashRouter,
} from "react-router-dom";

import "./App.css";
import HomePage from "./HomePage";
import NotFoundPage from "./NotFound";
import OtherPage from "./OtherPage";

function App() {
  return (
    <div className="App">
      <h1>App One</h1>

      <HashRouter>
        <Switch>
          <Route exact path={"/"} component={HomePage} />
          <Route path={"/other"} component={OtherPage} />
          <Route path={"*"} component={NotFoundPage} />
        </Switch>

        <div>
          <Link to={"/other"}>Other page</Link>
        </div>
        <div>
          <Link to={"/unknown"}>Bad link</Link>
        </div>
      </HashRouter>
    </div>
  );
}

export default App;
