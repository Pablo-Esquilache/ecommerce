const fs = require('fs');
const sharp = require('sharp');
const path = require('path');

const uploadDir = 'C:/Users/pablo/.gemini/antigravity/brain/b82eb01a-92d0-4a4b-a364-ef4ebb0ae351/.user_uploaded/';
const outputDir = 'frontend/public/img/';

const selectedImages = [
    'media_1786410703859.jpg', // Poncho mostaza
    'media_1786410817186.jpg', // Gorro mostaza
    'media_1786410817256.jpg', // Piluso verde
    'media_1786410817283.jpg', // Cuello verde
    'media_1786410703748.jpg'  // Sweater blanco
];

async function processGallery() {
    for (let i = 0; i < selectedImages.length; i++) {
        const file = selectedImages[i];
        const inputPath = path.join(uploadDir, file);
        const outputPath = path.join(outputDir, `galeria_mini_${i + 1}.webp`);
        
        await sharp(inputPath)
            .resize({ width: 400, withoutEnlargement: true }) // Redimensionar para la tira
            .webp({ quality: 80 })
            .toFile(outputPath);
            
        console.log(`Optimized ${file} to galeria_mini_${i + 1}.webp`);
    }
}

processGallery().catch(console.error);
