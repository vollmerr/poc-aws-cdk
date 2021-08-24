import { BrowserRouter, Switch, Route, Link } from "react-router-dom";

import "./App.css";
import NotFoundPage from "./NotFound";
import OtherPage from "./OtherPage";

function App() {
  return (
    <div className="App">
      <h1>App One</h1>

      <Link to={"/other"}>Other page</Link>
      <Link to={"/unknown"}>Bad link</Link>

      <BrowserRouter>
        <Switch>
          <Route path={"/other"} component={OtherPage} />
          <Route path={"*"} component={NotFoundPage} />
        </Switch>
      </BrowserRouter>
    </div>
  );
}

export default App;
