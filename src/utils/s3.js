/**
 * Acces au bucket S3 qui stocke les fichiers publics (publications, images,
 * medias). Remplace Firebase Storage : les URLs persistees en base pointent
 * desormais sur ce bucket, au format virtual-hosted :
 *   https://<bucket>.s3.<region>.amazonaws.com/<cle encodee>
 *
 * Les identifiants AWS ne sont jamais passes explicitement : en production ils
 * viennent du role IAM attache a l'instance EC2, en local de ~/.aws.
 */
const fs = require("fs");
const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const REGION = process.env.AWS_REGION || "eu-west-3";
// S3_PUBLIC_BUCKET : ancien nom, conserve pour compatibilite avec les scripts.
const BUCKET = process.env.S3_UPLOADS_BUCKET || process.env.S3_PUBLIC_BUCKET;

let client = null;
const getClient = () => {
  if (!client) client = new S3Client({ region: REGION });
  return client;
};

const isConfigured = () => Boolean(BUCKET);

const baseUrl = () => `https://${BUCKET}.s3.${REGION}.amazonaws.com`;

const encodeKey = (key) => key.split("/").map(encodeURIComponent).join("/");

/**
 * Prefixe des pieces jointes des demandes de micro-donnees. Le bucket est
 * public en lecture SAUF ce prefixe, exclu par un Deny dans la bucket policy
 * (voir instad-infra/s3-public-files-bucket-policy.json) : ces fichiers
 * contiennent des donnees personnelles et ne sont lisibles que via une URL
 * presignee generee par l'API.
 */
const PRIVATE_PREFIX = "microdonnees";

const keyToUrl = (key) => `${baseUrl()}/${encodeKey(key)}`;

/**
 * Nettoie le chemin envoye par le client : segments vides et "." / ".." qui
 * donneraient des cles S3 bancales.
 */
const normalizeKey = (rawPath) =>
  String(rawPath || "")
    .split("/")
    .map((segment) => segment.trim())
    .filter((segment) => segment && segment !== "." && segment !== "..")
    .join("/");

/**
 * Extrait la cle S3 d'une URL de notre bucket (forme virtual-hosted ou
 * path-style). Renvoie null si l'URL pointe ailleurs - typiquement une ancienne
 * URL Firebase restee en base : il n'y a alors rien a supprimer cote S3.
 */
const urlToKey = (rawUrl) => {
  if (!isConfigured()) return null;

  let parsed;
  try {
    parsed = new URL(String(rawUrl));
  } catch (error) {
    return null;
  }

  const path = decodeURIComponent(parsed.pathname.replace(/^\//, ""));

  if (parsed.hostname.startsWith(`${BUCKET}.s3`)) {
    return path || null;
  }

  // path-style : s3.<region>.amazonaws.com/<bucket>/<cle>
  if (/^s3[.-]/.test(parsed.hostname) && path.startsWith(`${BUCKET}/`)) {
    return path.slice(BUCKET.length + 1) || null;
  }

  return null;
};

/**
 * Envoie un fichier sur disque vers S3 en streaming (le binaire ne passe pas
 * en memoire) et renvoie son URL publique.
 */
const putFile = async ({ key, filePath, size, contentType, cacheControl }) => {
  await getClient().send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: fs.createReadStream(filePath),
      ContentLength: size,
      ContentType: contentType || "application/octet-stream",
      CacheControl:
        cacheControl ||
        (key.startsWith(`${PRIVATE_PREFIX}/`)
          ? "private, no-store"
          : "public, max-age=31536000, immutable"),
    })
  );

  return keyToUrl(key);
};

/**
 * URL temporaire pour telecharger un objet non public (pieces jointes).
 * Signee avec les credentials du role IAM de l'instance, donc valable malgre
 * le Deny public sur le prefixe.
 */
const presignGetUrl = async (key, { expiresIn = 300, downloadName } = {}) =>
  getSignedUrl(
    getClient(),
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ResponseContentDisposition: downloadName
        ? `attachment; filename="${downloadName.replace(/"/g, "")}"`
        : undefined,
    }),
    { expiresIn }
  );

const deleteKey = async (key) => {
  await getClient().send(
    new DeleteObjectCommand({ Bucket: BUCKET, Key: key })
  );
};

module.exports = {
  isConfigured,
  PRIVATE_PREFIX,
  presignGetUrl,
  bucket: () => BUCKET,
  region: () => REGION,
  normalizeKey,
  keyToUrl,
  urlToKey,
  putFile,
  deleteKey,
};
