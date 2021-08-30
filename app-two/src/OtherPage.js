import { useHistory, useLocation } from "react-router-dom";

const style = { textAlign: 'initial', margin: 'auto', width: '500px' }

const OtherPage = () => {
  const history = useHistory();
  const location = useLocation();

  return (
    <div>
      <h2>Other Page</h2>
      <h4>history</h4>
      <pre style={style}>{JSON.stringify(history, null, 2)}</pre>
      <h4>location</h4>
      <pre style={style}>{JSON.stringify(location, null, 2)}</pre>
      <button onClick={() => history.push("/")}>go to /</button>
      <button onClick={history.goBack}>go back</button>
    </div>
  );
};

export default OtherPage;
