const fs = require('fs');
let js = fs.readFileSync('backend/controllers/categoriaController.js', 'utf8');

const logic = 
const supabase = require('../config/supabase');
async function uploadToSupabase(file, bucket = 'categorias') {
    if (!file) return null;
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = (file.originalname || '').split('.').pop().replace(/[^a-zA-Z0-9]/g, '');
    const filename = \\.\\;
    
    const { data, error } = await supabase
      .storage
      .from(bucket)
      .upload(filename, file.buffer, {
        contentType: file.mimetype
      });
      
    if (error) {
      console.error('Error uploading to Supabase:', error);
      throw error;
    }
    
    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(filename);
    return publicData.publicUrl;
}

exports.uploadImage = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No se subió ninguna imagen' });
        const url = await uploadToSupabase(req.file, 'categorias');
        res.json({ url });
    } catch (error) {
        console.error('Error uploading category image:', error);
        res.status(500).json({ error: 'Error al subir la imagen' });
    }
};
;

if (!js.includes('exports.uploadImage')) {
    js += '\n' + logic;
    fs.writeFileSync('backend/controllers/categoriaController.js', js, 'utf8');
}
