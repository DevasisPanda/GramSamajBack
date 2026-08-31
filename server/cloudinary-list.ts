import * as dotenv from 'dotenv';
dotenv.config();
import { v2 as cloudinary } from 'cloudinary';

if (process.env.CLOUDINARY_URL) {
  const matches = process.env.CLOUDINARY_URL.match(/cloudinary:\/\/([^:]+):([^@]+)@(.+)/);
  if (matches) {
    cloudinary.config({
      api_key: matches[1],
      api_secret: matches[2],
      cloud_name: matches[3],
      secure: true
    });
  }
}

async function run() {
  try {
    const result = await cloudinary.api.resources({ type: 'upload', max_results: 100 });
    console.log("Cloudinary Uploaded Assets:");
    result.resources.forEach((res: any) => {
      if (res.public_id.includes("ngo-management") || res.public_id.includes("templates") || res.public_id.includes("certifications")) {
        console.log(`- ${res.public_id} URL: ${res.secure_url}`);
      }
    });
  } catch (error) {
    console.error("Error:", error);
  }
}

run();
