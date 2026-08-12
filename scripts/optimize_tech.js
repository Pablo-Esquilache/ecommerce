const sharp = require('sharp');
const path = require('path');

const brainDir = 'C:/Users/pablo/.gemini/antigravity/brain/b82eb01a-92d0-4a4b-a364-ef4ebb0ae351';
const outDir = 'frontend/public/img';

const images = [
    { src: 'logo_electronics_1786503294469.jpg', dest: 'logo.png', width: null, format: 'png' },
    { src: 'portada1_gen_1786503307270.jpg', dest: 'portada1.webp', width: 1920, format: 'webp' },
    { src: 'portada2_gen_1786503319728.jpg', dest: 'portada2.webp', width: 1920, format: 'webp' },
    { src: 'portada3_gen_1786503346190.jpg', dest: 'portada3.webp', width: 1920, format: 'webp' },
    { src: 'portada1_vertical_1786503358537.jpg', dest: 'portada1_vertical.webp', width: 1080, format: 'webp' },
    { src: 'portada2_vertical_1786503488318.jpg', dest: 'portada2_vertical.webp', width: 1080, format: 'webp' },
    { src: 'portada3_vertical_1786503499011.jpg', dest: 'portada3_vertical.webp', width: 1080, format: 'webp' },
    { src: 'quienes_somos_1_tech_1786503546336.jpg', dest: 'quienes_somos_1.webp', width: 800, format: 'webp' },
    { src: 'quienes_somos_2_tech_1786503557273.jpg', dest: 'quienes_somos_2.webp', width: 800, format: 'webp' },
    { src: 'galeria_1_tech_1786503567468.jpg', dest: 'galeria_mini_1.webp', width: 800, format: 'webp' },
    { src: 'galeria_2_tech_1786503578163.jpg', dest: 'galeria_mini_2.webp', width: 800, format: 'webp' },
    { src: 'galeria_3_tech_1786503588152.jpg', dest: 'galeria_mini_3.webp', width: 800, format: 'webp' }
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
