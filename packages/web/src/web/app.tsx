import { useEffect } from "react";
import { Route, Switch } from "wouter";
import Index from "./pages/index";
import FlutterVersions from "./pages/flutter-versions";
import FlutterVersionChecker from "./pages/flutter-version-checker";
import BlogPage from "./pages/blog";
import FaqPage from "./pages/faq";
import ChangelogPage from "./pages/changelog";
import { Provider } from "./components/provider";

function ReleaseRedirect() {
  useEffect(() => {
    const version = window.location.pathname
      .replace(/^\/release\//, "")
      .replace(/\/$/, "");

    if (!window.location.pathname.endsWith("/")) {
      window.location.replace(`/release/${encodeURIComponent(version)}/`);
      return;
    }

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
        <Route path="/tools/flutter-version-checker/" component={FlutterVersionChecker} />
        <Route path="/tools/flutter-version-checker" component={FlutterVersionChecker} />
        <Route path="/blog/" component={BlogPage} />
        <Route path="/blog" component={BlogPage} />
        <Route path="/faq/" component={FaqPage} />
        <Route path="/faq" component={FaqPage} />
        <Route path="/changelog/" component={ChangelogPage} />
        <Route path="/changelog" component={ChangelogPage} />
        <Route path="/flutter-versions/" component={FlutterVersions} />
        <Route path="/flutter-versions" component={FlutterVersions} />
        <Route path="/" component={Index} />
      </Switch>
    </Provider>
  );
}

export default App;
