const os = require("os");
const https = require("https");

function mapArch(arch) {
  const mappings = {
    x32: "386",
    x64: "amd64",
  };
  return mappings[arch] || arch;
}

function getLatestReleaseTag() {
  const options = {
    hostname: "api.github.com",
    path: "/repos/matter-labs/foundry-zksync/releases/latest",
    headers: {
      "User-Agent": "node.js",
    },
  };

  return new Promise((resolve, reject) => {
    https
      .get(options, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const release = JSON.parse(data);
            // Expecting a tag name like "v0.0.9"
            resolve(release.tag_name);
          } catch (err) {
            reject(new Error("Failed to parse latest release tag"));
          }
        });
      })
      .on("error", reject);
  });
}

/**
 * Returns a promise resolving to an object with the download URL and binPath.
 *
 * - If no version is specified or version === "latest", it fetches the latest release tag
 *   (e.g. "v0.0.9") and constructs the URL accordingly.
 * - If a version is provided and it starts with "foundry-zksync-", that prefix is used
 *   for the folder name, while being stripped for the filename.
 * - Otherwise, if a version like "v0.0.7" is provided, the folder name is built as
 *   "foundry-zksync-v0.0.7" and the filename uses "v0.0.7".
 */
async function getDownloadObject(version = "latest") {
  let tag;
  let folderName;
  let rawVersionForFilename;

  if (!version || version === "latest") {
    // When "latest" is requested, fetch the latest release tag from GitHub API.
    tag = await getLatestReleaseTag();
    folderName = `foundry-zksync-${tag}`;
    rawVersionForFilename = tag;
  } else {
    // If the user supplies a version manually.
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
