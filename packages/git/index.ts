/**
 * Reference: https://github.com/vuejs/vuepress/tree/master/packages/%40vuepress/plugin-last-updated
 */

import { spawnSync } from "child_process"

export const gitLastUpdated = (
  fd: string
): { hash: string; timestamp: number } => {
  try {
    // detailed format see https://git-scm.com/docs/pretty-formats
    const [hash, timestamp] = spawnSync("git", [
      "log",
      "-1",
      "--format=%t-%ct",
      fd,
    ])
      .stdout.toString()
      .split("-")

    return { hash, timestamp: parseInt(timestamp) }
  } catch (error) {
    /* leave this for later */
  }

  return { timestamp: 0, hash: "0000000" }
}
