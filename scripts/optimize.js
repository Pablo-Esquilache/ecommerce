const fs = require('fs');
const sharp = require('sharp');

async function processImages() {
  await sharp('C:/Users/pablo/.gemini/antigravity/brain/b82eb01a-92d0-4a4b-a364-ef4ebb0ae351/.user_uploaded/media_1786383118125.jpg')
    .resize({ width: 600, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile('frontend/public/img/quienes_somos_1.webp');

  await sharp('C:/Users/pablo/.gemini/antigravity/brain/b82eb01a-92d0-4a4b-a364-ef4ebb0ae351/.user_uploaded/media_1786383118143.jpg')
    .resize({ width: 600, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile('frontend/public/img/quienes_somos_2.webp');
    
  console.log("Images optimized");
}

processImages().catch(console.error);
