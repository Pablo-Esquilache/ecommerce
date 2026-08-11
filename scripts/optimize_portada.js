const sharp = require('sharp');
const path = require('path');

const uploadPath = 'C:/Users/pablo/.gemini/antigravity/brain/b82eb01a-92d0-4a4b-a364-ef4ebb0ae351/.user_uploaded/media_1786411353453.jpg';
const outputPath = 'frontend/public/img/portada3.webp';

async function processPortada() {
    await sharp(uploadPath)
        .resize({ width: 2752, height: 1536, fit: 'cover' })
        .webp({ quality: 80 })
        .toFile(outputPath);
        
    console.log('Optimized portada3.webp');
}

processPortada().catch(console.error);
