import { Router } from 'express';

export function mentorRoutes(services: any) {
  const { supabase, authenticate, authorizeAdmin, calculatePercentage, updateWalletBalance, processPlanPurchase, evaluateTasks, checkDailyReset, getOrCreateProfile } = services;
  const router = Router();



  // AI Mentor Chat Endpoint
  router.post('/mentor/chat', authenticate, async (req: any, res: any) => {
    try {







    const user = req.user;

      const { message, settingsName } = req.body;
      if (!message) return res.status(400).json({ error: 'Mensaje es requerido' });

      // Get user profile for context
      const { data: profile } = await supabase
        .from('users')
        .select('name, level, plan, wallet_balance')
        .eq('id', user.id)
        .single();
        
      // Get referral count
      const { count: referralsCount } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_id', user.id);

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not configured on the server.');
      }

      // We dynamically import so it doesn't break if not using AI
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });

      const appName = settingsName || 'ImpulsaRed';
      const systemInstruction = `Eres el Mentor Financiero IA de ${appName}. Tu objetivo es ayudar a los usuarios a crecer su red de referidos, motivarlos a completar sus tareas diarias, darles estrategias de ventas y explicarles cómo subir de nivel para alcanzar el 70% de comisión. 
      
      Contexto del usuario actual:
      - Nombre: ${profile?.name || 'Usuario'}
      - Nivel: ${profile?.level || 1}
      - Plan: ${profile?.plan || 'Gratis'}
      - Saldo: $${(profile?.wallet_balance || 0).toLocaleString('es-CO')}
      - Referidos Directos: ${referralsCount || 0}
      
      Sé entusiasta, profesional y motivador. Usa un tono de líder de equipo. Menciona datos de su progreso si es relevante para motivarlo.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: message,
        config: {
          systemInstruction,
        }
      });

      res.json({ reply: response.text });
    } catch (error: any) {
      console.error("Error in AI Mentor chat:", error);
      res.status(500).json({ error: error.message || "Error al comunicarse con la IA" });
    }
  });

  // AI Script Generator for Prospecting
  router.post('/mentor/prospecting-script', authenticate, async (req: any, res: any) => {
    try {
      const user = req.user;
      const { audience, tone, settingsName, referralLink } = req.body;

      const { data: profile } = await supabase
        .from('users')
        .select('name, referral_code, plan')
        .eq('id', user.id)
        .single();

      const appName = settingsName || 'ImpulsaRed';
      const refUrl = referralLink || `${process.env.APP_URL || ''}/register?ref=${profile?.referral_code || ''}`;
      const senderName = profile?.name || 'Un amigo';

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        // Fallback templates if no API key is provided
        const templates: Record<string, string> = {
          friends: `¡Hola! 👋 Mira, encontré una plataforma llamada ${appName} donde estoy generando ingresos diarios completando tareas sencillas y creando equipo. Me pareció genial y pensé en ti. Te dejo mi enlace para que te registres y empecemos juntos: ${refUrl} 🚀`,
          entrepreneurs: `Hola 👋 Si estás buscando diversificar ingresos este mes, te recomiendo ver ${appName}. El sistema te permite ganar comisiones directas y de equipo por actividad diaria. Échale un ojo aquí: ${refUrl}`,
          students: `¡Hola! 🎓 Encontré esta app (${appName}) que permite ganar dinero extra desde el celular en tiempos libres. Te paso mi link para que te unas a mi grupo: ${refUrl}`,
          professionals: `Estimado/a, te comparto una iniciativa de micro-franquicia digital en ${appName} con comisiones de hasta el 70%. Puedes registrarte y revisar el modelo de negocio en este enlace: ${refUrl}`
        };
        const script = templates[audience] || templates.friends;
        return res.json({ script });
      }

      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });

      const prompt = `Genera un mensaje de prospección corto, persuasivo y muy natural para WhatsApp/Instagram invitando a una persona a unirse a la plataforma ${appName}.
      
      Público objetivo: ${audience || 'Amigos cercanos'}
      Tono deseado: ${tone || 'Cercano, entusiasta y creíble'}
      Remitente: ${senderName}
      Enlace de referido a incluir obligatoriamente: ${refUrl}
      
      Reglas:
      - Máximo 3 o 4 líneas.
      - Evita sonar como spam o estafa piramidal; debe sonar profesional, honesto y directo.
      - Incluye emojis sutiles y llamados a la acción claros con el enlace.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt
      });

      res.json({ script: response.text });
    } catch (error: any) {
      console.error("Error generating prospecting script:", error);
      res.status(500).json({ error: error.message || "Error generando script" });
    }
  });

  return router;
}
