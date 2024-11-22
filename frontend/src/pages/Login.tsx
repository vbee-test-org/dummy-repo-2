import { useNavigate } from "react-router-dom";
import { useState } from "react";

const LoginPage = () => {
  const navigate = useNavigate();
  const [hasAgreed, setHasAgreed] = useState(false);

  const handleGithubLogin = () => {
    if (hasAgreed) {
      // Redirect to the GitHub OAuth URL for login
      window.location.href = "/api/v1/auth";
    } else {
      alert("Please agree to the disclaimer before proceeding.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#0d1117] via-[#161b22] to-[#0d1117] text-white">
      <div className="max-w-md p-6 bg-[#161b22]/80 backdrop-blur-lg rounded-xl shadow-lg border border-[#30363d]/50">
        <h2 className="text-3xl font-semibold text-center mb-6 bg-gradient-to-r from-[#58a6ff] to-[#4d8edb] bg-clip-text text-transparent">
          Login with GitHub
        </h2>

        <p className="mb-6 text-[#c9d1d9] text-center">
          By logging in with GitHub, you consent to allow us to access your
          basic GitHub profile information. Your data will be used solely to
          enhance your experience on our platform.
        </p>

        <div className="flex items-center justify-center mb-6">
          <input
            type="checkbox"
            id="disclaimer"
            checked={hasAgreed}
            onChange={() => setHasAgreed(!hasAgreed)}
            className="mr-2"
          />
          <label htmlFor="disclaimer" className="text-[#8b949e]">
            I agree to the disclaimer
          </label>
        </div>

        <button
          onClick={handleGithubLogin}
          className="w-full px-6 py-3 bg-gradient-to-r from-[#238636] to-[#2ea043] text-white font-semibold rounded-lg shadow-md transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!hasAgreed}
        >
          Login with GitHub
        </button>
      </div>

      <button
        onClick={() => navigate("/")}
        className="mt-4 text-sm text-[#58a6ff] underline hover:text-[#4d8edb] transition-colors duration-200"
      >
        Go back to Home
      </button>
    </div>
  );
};

export default LoginPage;
