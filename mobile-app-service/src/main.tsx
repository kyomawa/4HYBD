import React from "react";
import ReactDOM from "react-dom";
import App from "./App";

// Importer le service i18n avant de rendre l'application
import "./services/i18n.service";

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById("root")
);
