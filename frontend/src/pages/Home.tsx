import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Form from "../components/Form";
import Notification from "../components/Notification";

const Home = () => {
  const [showNotification, setShowNotification] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleNotification = (message: string, type: "success" | "error") => {
    console.log("Notification triggered:", message, type); // Log when notification is triggered
    setShowNotification(message);
    setTimeout(() => {
      setShowNotification(null);
    }, 5000);
  };

  const handleUnauthorized = () => {
    // Redirect to login after 401 error
    navigate("/login");
  };

  const handleGithubLogin = () => {
    // Redirect to the GitHub login page
    window.location.href = "/api/v1/auth";
  };

  return (
    <div className="min-h-screen flex justify-center items-center bg-gradient-to-br from-[#0d1117] via-[#161b22] to-[#0d1117] relative">
      <div className="w-full max-w-4xl p-8 z-10 flex flex-col items-center justify-center space-y-6">
        {showNotification && (
          <Notification
            message={showNotification}
            type="error"
            onClose={() => setShowNotification(null)}
          />
        )}
        <Form
          showNotification={handleNotification}
          onUnauthorized={handleUnauthorized}
        />
      </div>
      <button
        onClick={handleGithubLogin}
        className="absolute top-4 right-4 px-6 py-3 bg-gradient-to-r from-[#238636] to-[#2ea043] text-white font-semibold rounded-lg shadow-md transform hover:scale-105 transition-all duration-300"
      >
        Login with GitHub
      </button>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[15%] left-[10%] w-1/3 h-1/3 bg-[#58a6ff] opacity-10 blur-3xl rounded-full"></div>
        <div className="absolute bottom-[15%] right-[10%] w-1/3 h-1/3 bg-[#238636] opacity-10 blur-3xl rounded-full"></div>
      </div>
    </div>
  );
};

export default Home;
