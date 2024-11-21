import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./index.css";
import Home from "./pages/Home";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<div />} />
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<div />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
