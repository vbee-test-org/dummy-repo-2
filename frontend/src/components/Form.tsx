import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

type SubmitResponse = {
  message: string;
  jobId?: string;
};

type JobStatusResponse = {
  status: string;
  progress?: string;
  finishedOn?: string;
  failedReason?: string;
};

const githubUrlRegex = /^https:\/\/github\.com\/[\w-]+\/[\w-]+$/;

const Form = () => {
  const [githubLink, setGithubLink] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!githubLink) {
      setError("Please enter a GitHub repository URL");
      return;
    }
    if (!githubUrlRegex.test(githubLink)) {
      setError(
        "Invalid GitHub URL. Please enter a valid GitHub repository URL.",
      );
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);
    setJobError(null);

    try {
      const response = await axios.post<SubmitResponse>(
        "/api/v1/jobs",
        { link: githubLink },
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (response.data.jobId) {
        setGithubLink("");
        setSuccess("Form submitted successfully!");
        await checkJobStatus(response.data.jobId);
      }
    } catch (error) {
      setError("Failed to submit. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const checkJobStatus = async (jobId: string) => {
    try {
      // Polling the job status every 5 seconds
      const intervalId = setInterval(async () => {
        try {
          const response = await axios.get<JobStatusResponse>(
            `/api/v1/jobs/${jobId}`,
          );
          const { status, failedReason } = response.data;

          if (status === "completed") {
            clearInterval(intervalId);
            navigate("/dashboard");
          }

          if (status === "failed") {
            clearInterval(intervalId);
            setJobError(
              failedReason || "The job has failed. Please try again.",
            );
            setError("The job has failed. Please check the error details.");
          }
        } catch (error) {
          console.error("Error fetching job status:", error);
          clearInterval(intervalId);
          setError("Error checking job status. Please try again later.");
        }
      }, 5000);
    } catch (error) {
      setError("Error checking job status. Please try again later.");
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
            setSuccess(null);
            setJobError(null);
          }}
          placeholder="https://github.com/username/repo"
          required
          className="w-full px-4 py-3 bg-[#0d1117] border border-[#30363d] rounded-md text-[#c9d1d9] placeholder-[#8b949e]/50 focus:border-[#58a6ff] focus:ring-2 focus:ring-[#58a6ff]/10 outline-none transition duration-300"
        />
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        {jobError && <p className="mt-2 text-sm text-red-400">{jobError}</p>}
        {success && <p className="mt-2 text-sm text-green-400">{success}</p>}
      </div>
      <button
        onClick={handleSubmit}
        disabled={isLoading}
        className={`w-full px-4 py-3 text-white font-semibold rounded-md transition duration-300 ${
          isLoading
            ? "bg-[#2c6e49] cursor-not-allowed opacity-80"
            : "bg-gradient-to-r from-[#238636] to-[#2ea043] hover:from-[#2ea043] hover:to-[#238636] hover:-translate-y-0.5 active:translate-y-0.5 hover:shadow-lg hover:shadow-[#2ea043]/20"
        }`}
      >
        {isLoading ? "Submitting..." : "Submit Repository"}
      </button>
    </div>
  );
};

export default Form;
