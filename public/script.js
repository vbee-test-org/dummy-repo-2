document.getElementById("submit-btn").addEventListener("click", submitLink);

async function submitLink() {
  const githubLink = document.getElementById("github-link").value;
  try {
    const response = await fetch("/v1/jobs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ link: githubLink }),
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("Server response:", data);
    alert("Link submitted successfully!");
  } catch (error) {
    console.error(error);
    alert("Error submitting link: " + error.message);
  }
}
