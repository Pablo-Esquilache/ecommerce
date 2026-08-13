const sharp = require('sharp');
const path = require('path');

const brainDir = 'C:/Users/pablo/.gemini/antigravity/brain/b82eb01a-92d0-4a4b-a364-ef4ebb0ae351';
const outDir = 'frontend/public/img';

const images = [
    { src: 'galeria_4_tech_1786555677731.jpg', dest: 'galeria_mini_4.webp', width: 800, format: 'webp' },
    { src: 'galeria_5_tech_1786555862902.jpg', dest: 'galeria_mini_5.webp', width: 800, format: 'webp' },
    { src: 'producto_1_tech_1786555874862.jpg', dest: 'producto_1.webp', width: 800, format: 'webp' },
    { src: 'producto_2_tech_1786560881069.jpg', dest: 'producto_2.webp', width: 800, format: 'webp' },
    { src: 'producto_3_tech_1786560897193.jpg', dest: 'producto_3.webp', width: 800, format: 'webp' },
    { src: 'producto_4_tech_1786560908415.jpg', dest: 'producto_4.webp', width: 800, format: 'webp' },
    { src: 'producto_5_tech_1786560919563.jpg', dest: 'producto_5.webp', width: 800, format: 'webp' },
    { src: 'producto_6_tech_1786560930808.jpg', dest: 'producto_6.webp', width: 800, format: 'webp' }
];

async function processImages() {
    for (let img of images) {
        try {
            const srcPath = path.join(brainDir, img.src);
            const destPath = path.join(outDir, img.dest);
            
            let pipeline = sharp(srcPath);
            if (img.width) {
                pipeline = pipeline.resize({ width: img.width, withoutEnlargement: true });
            }
            if (img.format === 'webp') {
                pipeline = pipeline.webp({ quality: 80 });
            } else {
                pipeline = pipeline.png({ quality: 80 });
            }
            
            await pipeline.toFile(destPath);
            console.log(`Optimized ${img.dest}`);
        } catch (e) {
            console.error(`Error processing ${img.src}:`, e.message);
        }
    }
}

processImages();
