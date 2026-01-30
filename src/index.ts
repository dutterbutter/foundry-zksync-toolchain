import * as core from "@actions/core";
import * as github from "@actions/github";
import * as toolCache from "@actions/tool-cache";
import * as os from "os";
import * as path from "path";

import { restoreCache } from "./cache.js";

const FOUNDRY_ZKSYNC_REPO = "matter-labs/foundry-zksync";
const FOUNDRY_TOOLS = ["forge", "cast", "anvil", "chisel"];

function mapArch(arch: string): string {
  const mappings: Record<string, string> = {
    x32: "386",
    x64: "amd64",
  };
  return mappings[arch] || arch;
}

interface DownloadInfo {
  url: string;
  binPath: string;
}

async function getLatestReleaseTag(octokit: ReturnType<typeof github.getOctokit>): Promise<string> {
  const { data } = await octokit.rest.repos.getLatestRelease({
    owner: "matter-labs",
    repo: "foundry-zksync",
  });
  return data.tag_name;
}

/**
 * Constructs the download object.
 *
 * - For a missing version or when version === "latest":
 *    - Fetch the latest release tag (e.g., "foundry-zksync-v0.0.9").
 *    - Use that as the folder name.
 *    - Remove the "foundry-zksync-" prefix to construct the asset filename.
 *
 * - For user-specified versions:
 *    - If the version starts with "foundry-zksync-", we use it directly as the folder name
 *      and strip the prefix for the filename.
 *    - Otherwise, we prepend "foundry-zksync-" to the version for the folder name.
 *
 * The resulting URL is constructed as:
 * https://github.com/matter-labs/foundry-zksync/releases/download/<folderName>/foundry_zksync_<version>_<platform>_<arch>.<extension>
 */
async function getDownloadObject(
  version: string = "latest",
  octokit: ReturnType<typeof github.getOctokit>
): Promise<DownloadInfo> {
  let folderName: string;
  let rawVersionForFilename: string;

  if (!version || version === "latest") {
    const tag = await getLatestReleaseTag(octokit);
    // If the tag already includes the prefix, use it directly.
    if (tag.startsWith("foundry-zksync-")) {
      folderName = tag;
      rawVersionForFilename = tag.substring("foundry-zksync-".length);
    } else {
      folderName = `foundry-zksync-${tag}`;
      rawVersionForFilename = tag;
    }
  } else {
    if (version.startsWith("foundry-zksync-")) {
      folderName = version;
      rawVersionForFilename = version.substring("foundry-zksync-".length);
    } else {
      folderName = `foundry-zksync-${version}`;
      rawVersionForFilename = version;
    }
  }

  const platform = os.platform();
  const arch = mapArch(os.arch());
  const filename = `foundry_zksync_${rawVersionForFilename}_${platform}_${arch}`;
  const extension = platform === "win32" ? "zip" : "tar.gz";

  const url = `https://github.com/${FOUNDRY_ZKSYNC_REPO}/releases/download/${folderName}/${filename}.${extension}`;

  return {
    url,
    binPath: ".",
  };
}

async function main(): Promise<void> {
  try {
    const version = core.getInput("version") || "latest";
    const token = core.getInput("token") || process.env.GITHUB_TOKEN || "";
    const octokit = github.getOctokit(token);

    core.info(`Installing Foundry-ZKsync (version: ${version})`);

    // Get download URL
    const download = await getDownloadObject(version, octokit);
    core.info(`Downloading Foundry-ZKsync from: ${download.url}`);

    // Download the archive
    const pathToArchive = await toolCache.downloadTool(download.url, undefined, `token ${token}`);

    // Extract the archive onto host runner
    core.debug(`Extracting ${pathToArchive}`);
    const extract = download.url.endsWith(".zip") ? toolCache.extractZip : toolCache.extractTar;
    const pathToCLI = await extract(pathToArchive);

    // Expose the tool
    const binPath = path.join(pathToCLI, download.binPath);
    core.addPath(binPath);
    core.info(`Added ${binPath} to PATH`);

    // Restore cache
    if (core.getBooleanInput("cache")) {
      await restoreCache();
    } else {
      core.info("Cache not requested, not restoring cache");
    }

    // Print installed versions
    const { execSync } = await import("child_process");
    for (const bin of FOUNDRY_TOOLS) {
      try {
        core.info(`Running: ${bin} --version`);
        execSync(`${bin} --version`, { stdio: "inherit" });
      } catch {}
    }
  } catch (err) {
    core.setFailed(err instanceof Error ? err : String(err));
  }
}

export default main;

main();
