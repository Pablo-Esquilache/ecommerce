const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const imgDir = path.join(__dirname, '../frontend/public/img');

async function processImages() {
    try {
        const banners = ['portada2.jpg', 'portada3.jpg'];
        for (const banner of banners) {
            const bannerPath = path.join(imgDir, banner);
            if (fs.existsSync(bannerPath)) {
                const tempPath = path.join(imgDir, `temp_${banner}`);
                await sharp(bannerPath).jpeg({ quality: 65 }).toFile(tempPath);
                console.log(`Processed ${banner}`);
            }
        }
        console.log('Done!');
    } catch (e) {
        console.error('Error processing images:', e);
    }
}

processImages();
