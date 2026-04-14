import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Readable } from "stream";

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

function getS3Config() {
  return {
    endpoint: getRequiredEnv("S3_ENDPOINT"),
    region: process.env.S3_REGION || "us-east-1",
    bucket: getRequiredEnv("S3_BUCKET"),
    accessKeyId: getRequiredEnv("S3_ACCESS_KEY"),
    secretAccessKey: getRequiredEnv("S3_SECRET_KEY"),
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== "false",
  };
}

let s3Client: S3Client | null = null;

function getClient(): S3Client {
  if (s3Client) {
    return s3Client;
  }
  const config = getS3Config();
  s3Client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  return s3Client;
}

export async function putTranscriptionResult(
  key: string,
  body: string | Buffer
): Promise<{ key: string; size: number; contentType: string }> {
  const config = getS3Config();
  const contentType = "application/json; charset=utf-8";
  const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body, "utf8");
  await getClient().send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ContentLength: buffer.byteLength,
    })
  );
  return { key, size: buffer.byteLength, contentType };
}

function isReadableStream(body: unknown): body is Readable {
  return body instanceof Readable;
}

export async function getTranscriptionResult(
  key: string
): Promise<{ body: Buffer; contentType: string }> {
  const config = getS3Config();
  const response = await getClient().send(
    new GetObjectCommand({
      Bucket: config.bucket,
      Key: key,
    })
  );
  if (!response.Body || !isReadableStream(response.Body)) {
    throw new Error("S3 object body is not readable");
  }
  const chunks: Buffer[] = [];
  for await (const chunk of response.Body) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return {
    body: Buffer.concat(chunks),
    contentType: response.ContentType || "application/octet-stream",
  };
}
