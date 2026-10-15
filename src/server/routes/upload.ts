import { Router } from 'express';

export function uploadRoutes(services: any) {
  const { supabase, authenticate, authorizeAdmin, calculatePercentage, updateWalletBalance, processPlanPurchase, evaluateTasks, checkDailyReset, getOrCreateProfile } = services;
  const router = Router();



  // Upload Image
  const handleUpload = async (req: any, res: any) => {
    console.log(`[UPLOAD API] Processing ${req.method} request for /api/upload-image`);
    console.log(`[UPLOAD API] Headers: ${JSON.stringify(req.headers)}`);
    console.log(`[UPLOAD API] Body keys: ${Object.keys(req.body || {})}`);
    
    try {
      const { bucket, fileName, base64Data, contentType } = req.body;
      
      if (!bucket || !fileName || !base64Data) {
         console.warn('[UPLOAD API] Missing parameters:', { bucket: !!bucket, fileName: !!fileName, base64: !!base64Data });
         return res.status(400).json({ error: 'Faltan parámetros obligatorios (bucket, fileName, base64Data)' });
      }

      console.log(`[UPLOAD API] Bucket: ${bucket}, File: ${fileName}, Content-Type: ${contentType}`);
      console.log(`[UPLOAD API] Base64 length: ${base64Data.length}`);

      // Remove data URL prefix if present
      const base64String = base64Data.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64String, 'base64');

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, buffer, {
          contentType: contentType || 'image/jpeg',
          upsert: true
        });

      if (error) {
        console.error('[UPLOAD API] Supabase storage error:', error);
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      console.log(`[UPLOAD API] Success: ${publicUrl}`);
      res.json({ success: true, publicUrl });
    } catch (err: any) {
      console.error('[UPLOAD API] Fatal error:', err);
      res.status(500).json({ error: 'Error del servidor al procesar la imagen', details: err.message });
    }
  };

  router.post('/upload-image', authenticate, handleUpload);
  router.post('/upload-image/', authenticate, handleUpload);
  
  return router;
}
