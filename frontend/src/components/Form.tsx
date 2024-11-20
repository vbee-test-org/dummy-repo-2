import { useState } from "react";
import axios from "axios";

type SubmitResponse = {
  message: string;
  jobId?: string;
};

const Form = () => {
  const [githubLink, setGithubLink] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!githubLink) {
      setError("Please enter a GitHub repository URL");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post<SubmitResponse>(
        "http://127.0.0.1:5000/api/v1/jobs",
        {
          link: githubLink,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      console.log("Server response:", response.data);
      alert("Link submitted successfully!");
      setGithubLink("");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setError(
          error.response?.data?.message || error.message || "An error occurred",
        );
        console.error("API Error:", error.response?.data);
      } else {
        setError("An unexpected error occurred");
        console.error("Unexpected Error:", error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-[90%] max-w-lg p-10 bg-[#161b22]/80 backdrop-blur-lg rounded-xl shadow-lg border border-[#30363d]/50 relative">
      <h2 className="text-3xl font-semibold text-center mb-6 bg-gradient-to-r from-[#58a6ff] to-[#4d8edb] bg-clip-text text-transparent">
        Enter GitHub Link
      </h2>

      <div className="mb-6">
        <label
          htmlFor="github-link"
          className="block mb-2 text-sm font-medium text-[#8b949e]"
        >
          GitHub Repository URL
        </label>
        <input
          type="text"
          id="github-link"
          value={githubLink}
          onChange={(e) => {
            setGithubLink(e.target.value);
            setError(null);
          }}
          placeholder="https://github.com/username/repo"
          required
          className="w-full px-4 py-3 bg-[#0d1117] border border-[#30363d] rounded-md text-[#c9d1d9] placeholder-[#8b949e]/50 focus:border-[#58a6ff] focus:ring-2 focus:ring-[#58a6ff]/10 outline-none transition duration-300"
        />
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      </div>

      <button
        onClick={handleSubmit}
        disabled={isLoading}
        className="w-full px-4 py-3 bg-gradient-to-r from-[#238636] to-[#2ea043] text-white font-semibold rounded-md hover:from-[#2ea043] hover:to-[#238636] transform hover:-translate-y-0.5 active:translate-y-0.5 transition duration-300 hover:shadow-lg hover:shadow-[#2ea043]/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
      >
        {isLoading ? "Submitting..." : "Submit Repository"}
      </button>
    </div>
  );
};

export default Form;
