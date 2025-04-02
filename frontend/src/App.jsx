import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState } from "react"; 
import Login from "./pages/Chatbot";


const App = () => {
  const [user, setUser] = useState(null); 

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} /> 
      </Routes>
    </Router>
  );
};

export default App;
