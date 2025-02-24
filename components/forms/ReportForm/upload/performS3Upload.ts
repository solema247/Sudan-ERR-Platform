import fs from 'fs'
import { S3Client } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'

const s3Client = new S3Client({
  region: 'your-region',  // e.g., 'us-east-1'
  credentials: {
    accessKeyId: 'your-access-key-id',
    secretAccessKey: 'your-secret-access-key',
  },
})

// Read the file as a stream
const file = fs.createReadStream('file.png')

// Upload the file to S3
const upload = new Upload({
  client: s3Client,  // Pass the S3 client inside an object
  params: {
    Bucket: 'images',
    Key: 'very-large-file.png',  // Corrected Key value
    ContentType: 'image/png',
    Body: file,
  },
})

// Wait for upload to complete
await upload.done()
console.log('File uploaded successfully')
