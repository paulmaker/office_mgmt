import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export async function getPresignedUploadUrl(key: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME!,
    Key: key,
    ContentType: contentType,
  })

  // URL expires in 5 minutes
  return await getSignedUrl(s3Client, command, { expiresIn: 300 })
}

export async function getPresignedDownloadUrl(key: string) {
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME!,
    Key: key,
  })

  // URL expires in 1 hour
  return await getSignedUrl(s3Client, command, { expiresIn: 3600 })
}

export async function putObject(key: string, body: Buffer, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME!,
    Key: key,
    Body: body,
    ContentType: contentType,
  })

  return await s3Client.send(command)
}

export async function getObjectBuffer(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME!,
    Key: key,
  })

  const response = await s3Client.send(command)
  const stream = response.Body
  if (!stream) throw new Error("Empty response body from S3")

  const chunks: Uint8Array[] = []
  // @ts-ignore - S3 Body is a Readable stream in Node.js
  for await (const chunk of stream) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

export async function deleteObject(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME!,
    Key: key,
  })

  return await s3Client.send(command)
}
