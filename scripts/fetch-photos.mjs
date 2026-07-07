import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const USER_AGENT = "hokkaido-trip-shiori/1.0 (personal travel site)";
const REQUEST_DELAY_MS = 1500;
const MIN_IMAGE_BYTES = 10 * 1024;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const spotsPath = path.join(rootDir, "data", "spots.json");
const imagesDir = path.join(rootDir, "images");

const articleCandidates = {
  "hakodate-airport": ["函館空港"],
  "century-marina": ["函館駅"],
  "lucky-pierrot": ["ラッキーピエロ", "金森赤レンガ倉庫"],
  motomachi: ["八幡坂", "元町 (函館市)", "金森赤レンガ倉庫"],
  "teashop-yuhi": ["函館市", "函館湾"],
  "mt-hakodate": ["函館山"],
  "ikasei-daimon": ["函館朝市", "スルメイカ"],
  "onuma-park": ["大沼国定公園", "大沼 (七飯町)"],
  kanaya: ["かにめし", "長万部駅"],
  "niseko-view-plaza": ["道の駅ニセコビュープラザ", "羊蹄山"],
  "unwind-otaru": ["旧越中屋ホテル", "小樽市"],
  iso: ["色内", "日本銀行旧小樽支店"],
  "otaru-beer": ["小樽倉庫", "小樽運河"],
  "otaru-canal": ["小樽運河"],
};

let lastRequestFinishedAt = 0;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function throttledFetch(url, options = {}) {
  const waitMs = Math.max(0, lastRequestFinishedAt + REQUEST_DELAY_MS - Date.now());
  if (waitMs > 0) {
    await sleep(waitMs);
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      "User-Agent": USER_AGENT,
      ...options.headers,
    },
  });
  lastRequestFinishedAt = Date.now();

  if (response.status === 429 || response.status >= 500) {
    const retryAfter = Number(response.headers.get("retry-after"));
    const retryMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 5000;
    await sleep(retryMs);

    const retry = await fetch(url, {
      ...options,
      headers: {
        "User-Agent": USER_AGENT,
        ...options.headers,
      },
    });
    lastRequestFinishedAt = Date.now();
    return retry;
  }

  return response;
}

function apiUrl(base, params) {
  return `${base}?${new URLSearchParams(params).toString()}`;
}

async function fetchJson(url) {
  const response = await throttledFetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

async function getRepresentativeFile(articleTitle) {
  const url = apiUrl("https://ja.wikipedia.org/w/api.php", {
    action: "query",
    prop: "pageimages",
    piprop: "name",
    redirects: "1",
    titles: articleTitle,
    format: "json",
    formatversion: "2",
  });
  const data = await fetchJson(url);
  const page = data?.query?.pages?.[0];

  if (!page || page.missing || !page.pageimage) {
    return null;
  }

  return page.pageimage;
}

async function getCommonsImageInfo(fileName) {
  const normalizedFileName = fileName.replace(/^File:/i, "");
  const url = apiUrl("https://commons.wikimedia.org/w/api.php", {
    action: "query",
    titles: `File:${normalizedFileName}`,
    prop: "imageinfo",
    iiprop: "url|extmetadata",
    iiurlwidth: "800",
    format: "json",
    formatversion: "2",
  });
  const data = await fetchJson(url);
  const page = data?.query?.pages?.[0];
  const imageInfo = page?.imageinfo?.[0];

  if (!page || page.missing || !imageInfo) {
    return null;
  }

  return {
    title: page.title,
    fileName: normalizedFileName,
    thumbUrl: imageInfo.thumburl || imageInfo.url,
    filePageUrl:
      imageInfo.descriptionurl ||
      `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(normalizedFileName).replace(/%20/g, "_")}`,
    metadata: imageInfo.extmetadata || {},
  };
}

function decodeEntities(value) {
  return String(value ?? "")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'");
}

function cleanMetadata(value, fallback = "") {
  const clean = decodeEntities(value)
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return clean || fallback;
}

function metadataValue(metadata, key) {
  return cleanMetadata(metadata?.[key]?.value);
}

function isAllowedLicense(metadata) {
  const licenseText = [
    metadataValue(metadata, "LicenseShortName"),
    metadataValue(metadata, "License"),
    metadataValue(metadata, "UsageTerms"),
  ].join(" ");
  const normalized = licenseText
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return false;
  }

  if (/\bcc0\b/.test(normalized) || normalized.includes("creative commons zero")) {
    return true;
  }

  if (normalized.includes("public domain") || /\bpd\b/.test(normalized)) {
    return true;
  }

  if (/\bcc by\b/.test(normalized)) {
    return !/\b(nc|nd|noncommercial|no derivatives)\b/.test(normalized);
  }

  return false;
}

function creditFor(info) {
  const author = metadataValue(info.metadata, "Artist") || metadataValue(info.metadata, "Credit") || "Wikimedia Commons";
  const license =
    metadataValue(info.metadata, "LicenseShortName") ||
    metadataValue(info.metadata, "UsageTerms") ||
    metadataValue(info.metadata, "License") ||
    "Unknown license";

  return {
    author: author.length > 180 ? `${author.slice(0, 177)}...` : author,
    license,
    url: info.filePageUrl,
  };
}

function normalizedTitle(title) {
  return String(title || "")
    .replace(/^File:/i, "")
    .replace(/_/g, " ")
    .trim()
    .toLowerCase();
}

function imageKind(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpeg";
  }
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "png";
  }
  return null;
}

async function downloadImage(url) {
  const response = await throttledFetch(url, {
    headers: {
      Accept: "image/jpeg,image/png,*/*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function choosePhotoForSpot(spotId, usedImages, logs) {
  const candidates = articleCandidates[spotId] || [];

  for (const article of candidates) {
    try {
      const representativeFile = await getRepresentativeFile(article);
      if (!representativeFile) {
        logs.push({ spotId, article, status: "skip", reason: "no representative image" });
        continue;
      }

      const info = await getCommonsImageInfo(representativeFile);
      if (!info?.thumbUrl) {
        logs.push({ spotId, article, fileName: representativeFile, status: "skip", reason: "no Commons image info" });
        continue;
      }

      if (!isAllowedLicense(info.metadata)) {
        logs.push({
          spotId,
          article,
          fileName: info.fileName,
          status: "skip",
          reason: `license not allowed: ${metadataValue(info.metadata, "LicenseShortName") || "unknown"}`,
        });
        continue;
      }

      const imageKey = normalizedTitle(info.title || info.fileName);
      if (usedImages.has(imageKey)) {
        logs.push({ spotId, article, fileName: info.fileName, status: "skip", reason: "duplicate image" });
        continue;
      }

      const bytes = await downloadImage(info.thumbUrl);
      const kind = imageKind(bytes);
      if (bytes.length < MIN_IMAGE_BYTES || !kind) {
        logs.push({
          spotId,
          article,
          fileName: info.fileName,
          status: "skip",
          reason: `invalid image bytes: ${bytes.length} bytes, kind=${kind || "unknown"}`,
        });
        continue;
      }

      const imagePath = path.join(imagesDir, `${spotId}.jpg`);
      await writeFile(imagePath, bytes);
      usedImages.add(imageKey);

      const credit = creditFor(info);
      return {
        spotId,
        article,
        fileName: info.fileName,
        imageKind: kind,
        byteLength: bytes.length,
        photo: `images/${spotId}.jpg`,
        photoCredit: credit,
      };
    } catch (error) {
      logs.push({ spotId, article, status: "skip", reason: error.message });
    }
  }

  return null;
}

async function main() {
  await mkdir(imagesDir, { recursive: true });

  const data = JSON.parse(await readFile(spotsPath, "utf8"));
  const usedImages = new Set();
  const logs = [];
  const results = [];
  const missing = [];

  for (const spot of data.spots) {
    if (!articleCandidates[spot.id]) {
      continue;
    }

    spot.photo = "";
    delete spot.photoCredit;

    const selected = await choosePhotoForSpot(spot.id, usedImages, logs);
    if (selected) {
      spot.photo = selected.photo;
      spot.photoCredit = selected.photoCredit;
      results.push(selected);
      console.log(`OK ${spot.id}: ${selected.article} -> ${selected.fileName} (${selected.photoCredit.license})`);
    } else {
      missing.push(spot.id);
      console.log(`MISS ${spot.id}`);
    }
  }

  await writeFile(spotsPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");

  const report = {
    results: results.map(result => ({
      spotId: result.spotId,
      article: result.article,
      fileName: result.fileName,
      license: result.photoCredit.license,
      author: result.photoCredit.author,
      url: result.photoCredit.url,
      imageKind: result.imageKind,
      byteLength: result.byteLength,
    })),
    missing,
    skipped: logs,
  };

  console.log(JSON.stringify(report, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
