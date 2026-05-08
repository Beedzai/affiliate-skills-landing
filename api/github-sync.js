const crypto = require("crypto");

const json = (response, statusCode, body) => {
  response.statusCode = statusCode;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
};

const readBody = (request) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });

const verifyGitHubSignature = (rawBody, signature, secret) => {
  if (!signature || !secret) return false;

  const expected =
    "sha256=" +
    crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (signatureBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
};

const githubFetch = async (path) => {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      "user-agent": "affiliate-skills-sync",
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API ${response.status}: ${await response.text()}`);
  }

  return response.json();
};

const createDeployment = async ({ commitSha, commitMessage, branch }) => {
  const repo = process.env.GITHUB_REPO;
  const tree = await githubFetch(
    `/repos/${repo}/git/trees/${commitSha}?recursive=1`
  );

  const files = [];

  for (const item of tree.tree || []) {
    if (item.type !== "blob") continue;
    if (item.path.startsWith(".git")) continue;

    const blob = await githubFetch(`/repos/${repo}/git/blobs/${item.sha}`);
    files.push({
      file: item.path,
      data: blob.content.replace(/\n/g, ""),
      encoding: "base64",
    });
  }

  const response = await fetch(
    "https://api.vercel.com/v13/deployments?teamId=team_CmfEmaClse8Ws8W1MBLLSRH3",
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: process.env.VERCEL_PROJECT_NAME || "affiliate-skills",
        project: process.env.VERCEL_PROJECT_NAME || "affiliate-skills",
        target: "production",
        files,
        gitMetadata: {
          remoteUrl: `https://github.com/${repo}`,
          commitAuthorName: "GitHub",
          commitAuthorEmail: "noreply@github.com",
          commitMessage,
          commitRef: branch,
          commitSha,
          ci: true,
          ciType: "github-webhook",
          ciGitProviderUsername: repo.split("/")[0],
        },
        projectSettings: {
          framework: null,
          buildCommand: null,
          installCommand: null,
          outputDirectory: null,
        },
        meta: {
          githubWebhook: "true",
        },
      }),
    }
  );

  const deployment = await response.json();

  if (!response.ok) {
    throw new Error(`Vercel API ${response.status}: ${JSON.stringify(deployment)}`);
  }

  return deployment;
};

module.exports = async (request, response) => {
  if (request.method !== "POST") {
    return json(response, 405, { error: "Method not allowed" });
  }

  const rawBody = await readBody(request);
  const signature = request.headers["x-hub-signature-256"];

  if (!verifyGitHubSignature(rawBody, signature, process.env.GITHUB_WEBHOOK_SECRET)) {
    return json(response, 401, { error: "Invalid signature" });
  }

  const event = request.headers["x-github-event"];

  if (event !== "push") {
    return json(response, 202, { ignored: true, event });
  }

  const payload = JSON.parse(rawBody.toString("utf8"));
  const branch = (payload.ref || "").replace("refs/heads/", "");

  if (branch !== "main") {
    return json(response, 202, { ignored: true, branch });
  }

  try {
    const deployment = await createDeployment({
      commitSha: payload.after,
      commitMessage: payload.head_commit?.message || "GitHub push deployment",
      branch,
    });

    return json(response, 200, {
      deployed: true,
      deploymentId: deployment.id,
      url: deployment.url,
      readyState: deployment.readyState,
    });
  } catch (error) {
    return json(response, 500, { error: error.message });
  }
};
