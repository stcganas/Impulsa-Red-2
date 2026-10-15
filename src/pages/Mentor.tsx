import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, 
  Send, 
  User, 
  Bot, 
  Loader2, 
  ChevronLeft,
  MessageSquare,
  Lightbulb,
  Target,
  TrendingUp,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Share2,
  Copy,
  Check,
  Zap,
  Flame,
  Users
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useUser } from "../contexts/UserContext";
import { useSettings } from "../contexts/SettingsContext";
import { supabase } from "../lib/supabase";
import { GoogleGenAI, Modality } from "@google/genai";

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  isAudio?: boolean;
}

export default function Mentor() {
  const navigate = useNavigate();
  const { user, loading: userLoading } = useUser();
  const { settings } = useSettings();
  const [activeTab, setActiveTab] = useState<'chat' | 'scripts'>('chat');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: `¡Hola ${user?.name || 'Líder'}! Soy tu Mentor IA. Estoy aquí para ayudarte a escalar tu red de referidos y alcanzar ese 70% de comisión. ¿En qué puedo apoyarte hoy?`,
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Script Generator State
  const [scriptAudience, setScriptAudience] = useState('friends');
  const [scriptTone, setScriptTone] = useState('cercano');
  const [generatedScript, setGeneratedScript] = useState("");
  const [generatingScript, setGeneratingScript] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sessionRef = useRef<any>(null);
  const audioQueueRef = useRef<Int16Array[]>([]);
  const isPlayingRef = useRef(false);
  const nextStartTimeRef = useRef(0);
  const isRecordingRef = useRef(false);

  useEffect(() => {
    if (!userLoading && !user) {
      navigate("/login");
    }
  }, [user, userLoading, navigate]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Audio Playback Logic
  const scheduleAudio = useCallback(() => {
    if (!audioContextRef.current || isMuted) {
      return;
    }

    while (audioQueueRef.current.length > 0) {
      const floatData = audioQueueRef.current.shift() as unknown as Float32Array;

      const buffer = audioContextRef.current.createBuffer(1, floatData.length, 24000);
      buffer.getChannelData(0).set(floatData);

      const source = audioContextRef.current.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContextRef.current.destination);

      const now = audioContextRef.current.currentTime;
      // If nextStartTime is in the past, we fell behind. Reset to now + small lookahead.
      if (nextStartTimeRef.current < now) {
        nextStartTimeRef.current = now + 0.05;
      }
      
      source.start(nextStartTimeRef.current);
      nextStartTimeRef.current += buffer.duration;
    }
  }, [isMuted]);

  const handleLiveMessage = useCallback((message: any) => {
    // Handle User Transcription
    if (message.serverContent?.userTurn?.parts) {
      const textPart = message.serverContent.userTurn.parts.find((p: any) => p.text);
      if (textPart) {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          text: textPart.text,
          sender: 'user',
          timestamp: new Date()
        }]);
      }
    }

    if (message.serverContent?.modelTurn?.parts) {
      const parts = message.serverContent.modelTurn.parts;
      
    // Handle Audio
    const audioPart = parts.find((p: any) => p.inlineData?.mimeType?.includes('audio'));
    if (audioPart && !isMuted) {
      const base64Data = audioPart.inlineData.data;
      const binaryString = window.atob(base64Data);
      const len = binaryString.length;
      const buffer = new ArrayBuffer(len);
      const uint8 = new Uint8Array(buffer);
      for (let i = 0; i < len; i++) {
        uint8[i] = binaryString.charCodeAt(i);
      }
      const dataView = new DataView(buffer);
      const floatData = new Float32Array(len / 2);
      for (let i = 0; i < len; i += 2) {
        floatData[i / 2] = dataView.getInt16(i, true) / 32768.0;
      }
      
      audioQueueRef.current.push(floatData as any); // Storing Float32Array directly now
      scheduleAudio();
    }

      // Handle Transcription
      const textPart = parts.find((p: any) => p.text);
      if (textPart) {
        setMessages(prev => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg && lastMsg.sender === 'bot' && lastMsg.isAudio) {
            return [...prev.slice(0, -1), { ...lastMsg, text: lastMsg.text + textPart.text }];
          }
          return [...prev, {
            id: Date.now().toString(),
            text: textPart.text,
            sender: 'bot',
            timestamp: new Date(),
            isAudio: true
          }];
        });
      }
    }

    if (message.serverContent?.interrupted) {
      audioQueueRef.current = [];
      nextStartTimeRef.current = 0;
    }
  }, [isMuted, scheduleAudio]);

  const startVoiceSession = async () => {
    try {
      setError(null);
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        setError("La clave de la API de Gemini no está configurada. Por favor, asegúrate de que GEMINI_API_KEY esté en tus Secrets.");
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } }
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: `Eres el Mentor Financiero IA de ${settings.app_name || 'ImpulsaRed'}. Tu objetivo es ayudar a los usuarios a crecer su red de referidos, motivarlos a completar sus tareas diarias, darles estrategias de ventas y explicarles cómo subir de nivel para alcanzar el 70% de comisión. 
          
          Contexto del usuario actual:
          - Nombre: ${user?.name || 'Líder'}
          - Nivel: ${user?.level || 1}
          - Plan: ${user?.plan || 'Básico'}
          
          Sé entusiasta, profesional y motivador. Responde de forma concisa pero poderosa.`,
        },
        callbacks: {
          onopen: () => {
            console.log("Live session opened");
            setIsVoiceActive(true);
          },
          onmessage: handleLiveMessage,
          onclose: () => {
            console.log("Live session closed");
            setIsVoiceActive(false);
            stopVoiceSession();
          },
          onerror: (err) => {
            console.error("Live session error:", err);
            setIsVoiceActive(false);
            stopVoiceSession();
          }
        }
      });

      sessionRef.current = session;

      // Setup Audio Capture
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = audioContext;
      
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (!isRecordingRef.current) return;
        
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        let binary = '';
        const bytes = new Uint8Array(pcmData.buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        const base64Data = btoa(binary);
        
        session.sendRealtimeInput({
          audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
        });
      };

      source.connect(processor);
      
      // Connect processor to a silent gain node to prevent feedback loop
      const silentGain = audioContext.createGain();
      silentGain.gain.value = 0;
      processor.connect(silentGain);
      silentGain.connect(audioContext.destination);
      
      isRecordingRef.current = true;

    } catch (error: any) {
      console.error("Error starting voice session:", error);
      setError("No se pudo iniciar la sesión de voz. Verifica los permisos del micrófono y tu clave de API.");
    }
  };

  const stopVoiceSession = () => {
    isRecordingRef.current = false;
    setIsVoiceActive(false);
    
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    audioQueueRef.current = [];
    isPlayingRef.current = false;
    nextStartTimeRef.current = 0;
  };

  const toggleVoice = () => {
    if (isVoiceActive) {
      stopVoiceSession();
    } else {
      startVoiceSession();
    }
  };

  const handleSend = async (e?: any) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    const currentInput = input;
    setInput("");
    setLoading(true);
    setError(null);

    // If voice session is active, send via session
    if (sessionRef.current && isVoiceActive) {
      sessionRef.current.sendRealtimeInput({
        text: currentInput
      });
      setLoading(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No hay sesión activa");

      const res = await fetch('/api/mentor/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ 
          message: currentInput,
          settingsName: settings.app_name 
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error en la respuesta del mentor');
      }

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: data.reply || "Lo siento, tuve un pequeño error. ¿Podrías repetir eso?",
        sender: 'bot',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMsg]);

    } catch (error: any) {
      console.error("Mentor Error:", error);
      setError(error.message || "Lo siento, tuve un problema al procesar tu mensaje. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    { text: "¿Cómo consigo más referidos?", icon: Target },
    { text: "Estrategia para Plan Élite", icon: TrendingUp },
    { text: "¿Cómo subir de nivel rápido?", icon: Lightbulb },
  ];

  const handleGenerateScript = async () => {
    setGeneratingScript(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No hay sesión activa");

      const res = await fetch('/api/mentor/prospecting-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          audience: scriptAudience,
          tone: scriptTone,
          settingsName: settings.app_name,
          referralLink: `${window.location.origin}/register?ref=${user?.referral_code || ''}`
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al generar guión');
      setGeneratedScript(data.script);
      toast.success("¡Guión generado con éxito!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Error generando guión");
    } finally {
      setGeneratingScript(false);
    }
  };

  const handleCopyScript = () => {
    if (!generatedScript) return;
    navigator.clipboard.writeText(generatedScript);
    setCopiedScript(true);
    toast.success("¡Guión copiado al portapapeles!");
    setTimeout(() => setCopiedScript(false), 3000);
  };

  const handleOpenWhatsApp = () => {
    if (!generatedScript) return;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(generatedScript)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-[#0a0a0a] font-sans overflow-hidden transition-colors duration-300">
      {/* Header */}
      <div className="bg-slate-900 dark:bg-[#111] text-white px-6 pt-12 pb-6 relative overflow-hidden shrink-0 transition-colors duration-300">
        <div className="absolute top-[-50%] right-[-10%] w-[60%] h-[200%] bg-blue-600/20 blur-[60px] rounded-full pointer-events-none" />
        
        <div className="flex items-center justify-between relative z-10 mb-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">Mentor IA</h1>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-medium text-slate-400 dark:text-slate-500">Asesor de Crecimiento</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-white/10 p-1 rounded-2xl relative z-10 backdrop-blur-md">
          <button
            onClick={() => setActiveTab('chat')}
            className={cn(
              "flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5",
              activeTab === 'chat'
                ? "bg-white text-slate-900 shadow-md shadow-black/10"
                : "text-white/70 hover:text-white"
            )}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Chat & Voz IA</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('scripts');
              if (!generatedScript) {
                handleGenerateScript();
              }
            }}
            className={cn(
              "flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5",
              activeTab === 'scripts'
                ? "bg-white text-slate-900 shadow-md shadow-black/10"
                : "text-white/70 hover:text-white"
            )}
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Guiones de Prospección</span>
          </button>
        </div>
      </div>

      {activeTab === 'scripts' ? (
        /* Script Generator View */
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="bg-white dark:bg-[#111] rounded-3xl p-6 border border-slate-100 dark:border-white/5 shadow-sm space-y-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-500" />
                Generador de Guiones para WhatsApp y Redes
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                La IA creará mensajes persuasivos y naturales con tu enlace de referido personalizado listo para compartir.
              </p>
            </div>

            {/* Audience selection */}
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-2">
                ¿A quién vas a invitar?
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'friends', label: 'Amigos Cercanos', desc: 'Natural y directo' },
                  { id: 'entrepreneurs', label: 'Emprendedores', desc: 'Negocios e ingresos' },
                  { id: 'students', label: 'Estudiantes / Jóvenes', desc: 'Dinero extra flexible' },
                  { id: 'professionals', label: 'Profesionales', desc: 'Micro-franquicia digital' }
                ].map((aud) => (
                  <button
                    key={aud.id}
                    onClick={() => setScriptAudience(aud.id)}
                    className={cn(
                      "p-3 rounded-2xl border text-left transition-all",
                      scriptAudience === aud.id
                        ? "border-blue-600 bg-blue-50/50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold"
                        : "border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300"
                    )}
                  >
                    <p className="text-xs font-bold">{aud.label}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{aud.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Tone selection */}
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-2">
                Tono del mensaje
              </label>
              <div className="flex gap-2">
                {[
                  { id: 'cercano', label: 'Cercano y Amigable' },
                  { id: 'directo', label: 'Directo y al Grano' },
                  { id: 'formal', label: 'Profesional' }
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setScriptTone(t.id)}
                    className={cn(
                      "flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center",
                      scriptTone === t.id
                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent"
                        : "border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerateScript}
              disabled={generatingScript}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {generatingScript ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Generando Guión con IA...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Crear Nuevo Guión con IA</span>
                </>
              )}
            </button>
          </div>

          {/* Generated Result Box */}
          {generatedScript && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-[#111] rounded-3xl p-6 border border-slate-100 dark:border-white/5 shadow-sm space-y-4"
            >
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Guión Generado</span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                  Listo para Enviar
                </span>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5 font-medium text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                {generatedScript}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={handleCopyScript}
                  className="py-3.5 px-4 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-800 dark:text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  {copiedScript ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedScript ? '¡Copiado!' : 'Copiar Texto'}</span>
                </button>
                <button
                  onClick={handleOpenWhatsApp}
                  className="py-3.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Enviar a WhatsApp</span>
                </button>
              </div>
            </motion.div>
          )}
        </div>
      ) : (
        /* Chat Area */
        <>
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] dark:bg-none bg-fixed">
            {error && (
              <div className="p-4 mb-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-sm font-medium flex items-center justify-between">
                <span>{error}</span>
                <button onClick={() => setError(null)} className="text-red-500 hover:text-red-400">✕</button>
              </div>
            )}
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={cn(
                    "flex w-full",
                    msg.sender === 'user' ? "justify-end" : "justify-start"
                  )}
                >
                  <div className={cn(
                    "flex gap-3 max-w-[85%]",
                    msg.sender === 'user' ? "flex-row-reverse" : "flex-row"
                  )}>
                    <div className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                      msg.sender === 'user' ? "bg-slate-900 dark:bg-blue-600 text-white" : "bg-blue-600 dark:bg-slate-800 text-white"
                    )}>
                      {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>
                    
                    <div className={cn(
                      "p-4 rounded-3xl text-sm font-medium shadow-sm",
                      msg.sender === 'user' 
                        ? "bg-slate-900 dark:bg-blue-600 text-white rounded-tr-none" 
                        : "bg-white dark:bg-[#111] text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-white/5 rounded-tl-none"
                    )}>
                      {msg.text}
                      <div className={cn(
                        "text-[10px] mt-2 opacity-50",
                        msg.sender === 'user' ? "text-right" : "text-left"
                      )}>
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
              {loading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-600 dark:bg-slate-800 text-white flex items-center justify-center shadow-sm">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="bg-white dark:bg-[#111] p-4 rounded-3xl rounded-tl-none border border-slate-100 dark:border-white/5 shadow-sm flex items-center gap-2">
                      <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin" />
                      <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Pensando...</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-6 bg-white dark:bg-[#111] border-t border-slate-100 dark:border-white/5 shrink-0 transition-colors duration-300">
            {messages.length === 1 && (
              <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-2">
                {suggestions.map((s) => (
                  <button
                    key={s.text}
                    onClick={() => {
                      setInput(s.text);
                    }}
                    className="px-4 py-2 rounded-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap flex items-center gap-2 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:border-blue-100 dark:hover:border-blue-500/20 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
                  >
                    <s.icon className="w-3 h-3" />
                    {s.text}
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={handleSend} className="flex gap-2">
              <button
                type="button"
                onClick={toggleVoice}
                className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center transition-all active:scale-95 shadow-lg",
                  isVoiceActive 
                    ? "bg-red-500 text-white shadow-red-500/20" 
                    : "bg-emerald-500 text-white shadow-emerald-500/20"
                )}
              >
                {isVoiceActive ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>

              <div className="flex-1 relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={isVoiceActive ? "Escuchando..." : "Escribe tu pregunta aquí..."}
                  className="w-full pl-6 pr-12 py-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  {isVoiceActive && (
                    <button
                      type="button"
                      onClick={() => setIsMuted(!isMuted)}
                      className="text-slate-400 hover:text-blue-500 transition-colors"
                    >
                      {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </button>
                  )}
                  <MessageSquare className="w-5 h-5 text-slate-300 dark:text-slate-700" />
                </div>
              </div>
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="w-14 h-14 rounded-2xl bg-slate-900 dark:bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-slate-200 dark:shadow-black/20 hover:bg-slate-800 dark:hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
              >
                <Send className="w-6 h-6" />
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
