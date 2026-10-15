import "server-only";

/** Starts a workflow of THIS repository on main. The workflow file name is the
 *  only input — the repository and the ref are fixed here, so no caller can turn
 *  this into a dispatch of something else. Throws on anything but 200/204. */
export async function dispatchWorkflow(workflowFile: string, token: string): Promise<void> {
  if (!/^[a-z0-9-]+\.yml$/.test(workflowFile)) throw new Error("invalid workflow file name");
  const response = await fetch(`https://api.github.com/repos/lechuza79/pv-rechner/actions/workflows/${workflowFile}/dispatches`, {
    method: "POST", redirect: "error", signal: AbortSignal.timeout(8000),
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "Content-Type": "application/json", "X-GitHub-Api-Version": "2022-11-28" },
    body: JSON.stringify({ ref: "main" }),
  });
  if (response.status !== 204 && response.status !== 200) throw new Error(`HTTP ${response.status}`);
}
