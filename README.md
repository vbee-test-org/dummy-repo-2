# DORA Tracker
A simple tool to track a repository DORA metrics, currently we only implement 2 out of 4 metrics: Lead time for changes and Deployment frequency

For more information about DORA metrics and how to calculate them, please visit [DevOps Research and Assessment (DORA) metrics](https://docs.gitlab.com/ee/user/analytics/dora_metrics.html)

## Usage
[](./assets/home.png)

Input the link to your Github repository, for example: ["https://github.com/MusikStreaming/MusikStreamingBE"](https://github.com/MusikStreaming/MusikStreamingBE)

Currently, we only showcase this page and have not embed Metabase dashboard, once the request is sent, it should trigger the background worker to process, analyze the repository and save to MongoDB.

## To-dos
- Frontend
    - If the task is completed, redirect the user to the metabase dashboard
    - The button is used to  sent request to the worker, if it is spammed, it will exhaust the worker, MUST FIX
- Backend
    - Make routes to display deployments info (for future use)
    - Improve scanning logic

## Installation

### 0. Pre-installation
Before you install, make sure you have this in your .env file (or just prepare it if you use Docker):

```
PORT=5000
MONGO_URI="<YOUR_CONNECTION_STRING_HERE>"
MONGO_DB_NAME="<YOUR_DB_NAME_HERE>"

# You will be rate limited if this is not specified
# TO create your Personal Access Token (PAT) on Github, do the following:
# 1. Click on your profile icon > Settings
# 2. Scroll down and you will see `Developer Settings` on the left panel > Personal access token > Tokens (classic)
# 3. Create a new token, set the name, duration and with full control of private repositories > Generate token > Copy the token and paste it here (and save it somewhere safe for future use)

GH_PAT="<YOUR_GITHUB_PERSONAL_ACCESS_TOKEN_HERE>"

REDIS_URL="<YOUR_REDIS_URL_HERE>"
```

### 1. Using Node.js

```
# Install all dependencies
npm run composer

# Compile, build backend and frontend
npm run build

# Start server
npm run start
```

### 2. Using Dockerfile

```
docker build -t <your-prefered-app-name> .

docker run -e PORT=5000 \
-e MONGO_URI='<smt>' \
-e MONGO_DB_NAME='<smt>' \
-e GH_PAT='<smt>' \
-e REDIS_URL='<smt>' \
-p 5000:5000 \
--name <container-name> <image-name>
```

After that, it should be available on `http://localhost:5000`

## License
[MIT](./LICENSE)
