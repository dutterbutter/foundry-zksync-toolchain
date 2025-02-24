const os = require("os");

function normalizeVersionName(version) {
  // For nightly builds (40-character hash) use "latest" in the filename.
  return version.replace(/^nightly-[0-9a-f]{40}$/, "latest");
}

function mapArch(arch) {
  const mappings = {
    x32: "386",
    x64: "amd64",
  };
  return mappings[arch] || arch;
}

function getDownloadObject(version = "latest") {
  const platform = os.platform();
  const arch = mapArch(os.arch());

  let folderName;
  let rawVersionForFilename;

  // Check if the supplied version already includes the "foundry-zksync-" prefix.
  if (version.startsWith("foundry-zksync-")) {
    // Folder name is taken as-is.
    folderName = version;
    // For the filename, remove the prefix.
    rawVersionForFilename = version.substring("foundry-zksync-".length);
  } else {
    // If the version is "latest" or a nightly build, we don't add a prefix.
    if (version === "latest" || version.startsWith("nightly-")) {
      folderName = version;
    } else {
      folderName = `foundry-zksync-${version}`;
    }
    rawVersionForFilename = version;
  }

  // Normalize the version for the filename (e.g. converting a nightly hash to "latest")
  const normalizedVersion = normalizeVersionName(rawVersionForFilename);

  // Build the filename following the format: foundry_zksync_<version>_<platform>_<arch>
  const filename = `foundry_zksync_${normalizedVersion}_${platform}_${arch}`;
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
