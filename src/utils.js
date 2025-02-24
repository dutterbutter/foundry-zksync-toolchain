const os = require("os");
const https = require("https");

function mapArch(arch) {
  const mappings = {
    x32: "386",
    x64: "amd64",
  };
  return mappings[arch] || arch;
}

const getLatestReleaseTag = async () => {
  const url = "https://api.github.com/repos/matter-labs/foundry-zksync/releases/latest";
  const response = await fetch(url, { headers: { "User-Agent": "node.js" } });
  if (!response.ok) {
    throw new Error(`Failed to fetch latest release tag: ${response.statusText}`);
  }
  const release = await response.json();
  return release.tag_name;
};

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
async function getDownloadObject(version = "latest") {
  let folderName;
  let rawVersionForFilename;

  if (!version || version === "latest") {
    const tag = await getLatestReleaseTag();
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

  const url = `https://github.com/matter-labs/foundry-zksync/releases/download/${folderName}/${filename}.${extension}`;

  return {
    url,
    binPath: ".",
  };
}

module.exports = {
  getDownloadObject,
};
