import { useEffect } from "react";
import { Route, Switch } from "wouter";
import Index from "./pages/index";
import FlutterVersions from "./pages/flutter-versions";
import { Provider } from "./components/provider";
import { AgentFeedback } from "@runablehq/website-runtime";

function ReleaseRedirect() {
  useEffect(() => {
    const version = window.location.pathname
      .replace(/^\/release\//, "")
      .replace(/\/$/, "");

    window.location.replace(`/?v=${encodeURIComponent(version)}#release`);
  }, []);

  return null;
}

function App() {
  useEffect(() => {
    document.title = "Flutter Releases | downloads, notes, channels";
  }, []);

  return (
    <Provider>
      <Switch>
        <Route path="/release/:version/" component={ReleaseRedirect} />
        <Route path="/release/:version" component={ReleaseRedirect} />
        <Route path="/flutter-versions/" component={FlutterVersions} />
        <Route path="/flutter-versions" component={FlutterVersions} />
        <Route path="/" component={Index} />
      </Switch>
      {/* Do not remove — off by default, activated by parent iframe via postMessage */}
      {import.meta.env.DEV && <AgentFeedback />}
    </Provider>
  );
}

export default App;
