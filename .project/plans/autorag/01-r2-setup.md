# Step 1: R2 Bucket Setup

## Objective
Configure Cloudflare R2 storage bucket to store documentation that will be indexed by AutoRAG.

## Prerequisites
- Cloudflare account with R2 access
- Wrangler CLI installed
- .r2.env file configured with credentials

## Implementation Steps

### 1.1 Create R2 Bucket
```bash
# Using Cloudflare Dashboard:
# 1. Navigate to R2 → Create Bucket
# 2. Name: "baba-is-win-docs" 
# 3. Location: Automatic
# 4. Default Storage Class: Standard

# Or using Wrangler:
wrangler r2 bucket create baba-is-win-docs
```

### 1.2 Configure R2 Access Credentials
Create API token with R2 read/write permissions:
1. Cloudflare Dashboard → My Profile → API Tokens
2. Create Token → Custom token
3. Permissions: Account → Cloudflare R2 → Edit
4. Account Resources: Include → Your Account
5. Continue to summary → Create Token

Update `.r2.env` with:
- CLOUDFLARE_ACCOUNT_ID
- R2_ENDPOINT
- R2_ACCESS_KEY_ID
- R2_SECRET_ACCESS_KEY
- R2_BUCKET_NAME=baba-is-win-docs

### 1.3 Create Upload Script
Create `scripts/upload-to-r2.js`:
```javascript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load R2 credentials
dotenv.config({ path: '.r2.env' });

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

async function uploadFile(filePath, key) {
  const fileContent = fs.readFileSync(filePath);
  
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    Body: fileContent,
    ContentType: 'text/markdown',
  });
  
  try {
    await s3Client.send(command);
    console.log(`✓ Uploaded: ${key}`);
  } catch (error) {
    console.error(`✗ Failed to upload ${key}:`, error);
  }
}

// Upload documentation files
async function uploadDocumentation() {
  const docsDir = './docs-for-rag';
  const files = getAllFiles(docsDir);
  
  for (const file of files) {
    const key = path.relative(docsDir, file);
    await uploadFile(file, key);
  }
}

function getAllFiles(dir) {
  // Recursively get all .md files
  // Implementation here
}

uploadDocumentation();
```

### 1.4 Verify Bucket Contents
```bash
# List bucket contents
wrangler r2 object list baba-is-win-docs

# Or use the Cloudflare Dashboard to verify files
```

### 1.5 Configure CORS (if needed for direct access)
```json
{
  "AllowedOrigins": ["https://your-domain.com"],
  "AllowedMethods": ["GET"],
  "AllowedHeaders": ["*"],
  "MaxAgeSeconds": 3600
}
```

## Validation Checklist
- [ ] R2 bucket created successfully
- [ ] API credentials configured in .r2.env
- [ ] Upload script tested and working
- [ ] Documentation files uploaded to R2
- [ ] Bucket contents verified via Dashboard/CLI

## Troubleshooting

### Common Issues
1. **Authentication Error**: Verify API token has R2 permissions
2. **Upload Fails**: Check file paths and bucket name
3. **CORS Issues**: Configure CORS policy if accessing R2 directly
4. **Rate Limits**: Implement retry logic with exponential backoff

### Debug Commands
```bash
# Test R2 connection
wrangler r2 bucket list

# Check specific file
wrangler r2 object get baba-is-win-docs/path/to/file.md

# View bucket metrics
# Use Cloudflare Dashboard → R2 → Analytics
```

## Security Considerations
- Never commit .r2.env to version control
- Use read-only tokens for production
- Implement IP restrictions if possible
- Regular audit of bucket access logs

## Next Steps
→ Proceed to [02-autorag-instance-setup.md](./02-autorag-instance-setup.md)