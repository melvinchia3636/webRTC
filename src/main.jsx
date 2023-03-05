import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router } from "react-router-dom";
import CallScreen from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <Router>
    <CallScreen />
  </Router>
);
