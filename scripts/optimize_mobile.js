const sharp = require('sharp');
const fs = require('fs');

async function optimizeImages() {
    const images = [
        { src: 'C:/Users/pablo/.gemini/antigravity/brain/b82eb01a-92d0-4a4b-a364-ef4ebb0ae351/.user_uploaded/media_1786463248542.jpg', dest: 'frontend/public/img/portada1_vertical.webp' },
        { src: 'C:/Users/pablo/.gemini/antigravity/brain/b82eb01a-92d0-4a4b-a364-ef4ebb0ae351/.user_uploaded/media_1786463248550.jpg', dest: 'frontend/public/img/portada2_vertical.webp' },
        { src: 'C:/Users/pablo/.gemini/antigravity/brain/b82eb01a-92d0-4a4b-a364-ef4ebb0ae351/.user_uploaded/media_1786463248571.jpg', dest: 'frontend/public/img/portada3_vertical.webp' }
    ];

    for (let img of images) {
        if (fs.existsSync(img.src)) {
            await sharp(img.src)
                .resize({ width: 1080, withoutEnlargement: true }) // Max width 1080 to save size but keep ratio
                .webp({ quality: 85 })
                .toFile(img.dest);
            console.log(`Optimized ${img.dest}`);
        } else {
            console.log(`Missing file: ${img.src}`);
        }
    }
}

optimizeImages().catch(console.error);
