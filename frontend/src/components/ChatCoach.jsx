import { useState, useRef, useEffect } from 'react';
import { Bot, Send, User, Loader2, ChevronLeft, Mic, MicOff, PlayCircle, SquareSquare, Activity, CheckCircle, AlertCircle, FileText, X, Trash2, Volume2, Sparkles } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import LogoNext from '../components/LogoNext';
import Robot3D from '../components/Robot3D';
import axiosInstance from '../api/axiosInstance';
import TemplateManager from './TemplateManager';

const ChatCoach = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Referencia paraTTS para evitar recolección de basura
    const utteranceRef = useRef(null);
    const audioRef = useRef(null); // Para audio de ElevenLabs

    // La voz ahora se maneja 100% desde Google Cloud TTS (Neural2) en el Backend

    // Detectar modo creación de CV desde query param ?mode=createcv
    const isCvMode = new URLSearchParams(location.search).get('mode') === 'createcv';
    // Plantilla seleccionada en CV Maker Hub — se propaga al backend en cada llamada
    const templateId = new URLSearchParams(location.search).get('templateId') || 'francisco';

    // Clave de almacenamiento local para persistir conversación entre recargas
    const chatStorageKey = isCvMode ? 'nextapp_cv_messages' : 'nextapp_coach_messages';

    // Job HuNTER: si venimos con datos de un empleo, prepara el prompt automático
    const pendingJobPrepRef = useRef(location.state?.jobPrep || null);

    // 1. Estados
    const [isInterviewMode, setIsInterviewMode] = useState(false);

    // null = sin modal | { status: 'generating' | 'ready' | 'error' }
    const [cvModal, setCvModal] = useState(null);

    // Modal post-exportación: null | 'confirm' | 'changes'
    const [exportModal, setExportModal] = useState(null);
    const [showExitModal, setShowExitModal] = useState(false);

    // Plantilla activa (puede cambiar desde el selector sin perder datos)
    const [selectedTemplate, setSelectedTemplate] = useState(templateId);
    // Vista previa CV en mobile
    const [showMobilePreview, setShowMobilePreview] = useState(false);

    // Datos del CV — se restauran desde localStorage en modo CV
    const [cvData, setCvData] = useState(() => {
        if (!isCvMode) return {};
        try {
            const saved = localStorage.getItem('nextapp_cv_data');
            return saved ? JSON.parse(saved) : {};
        } catch { return {}; }
    });
    const [profilePicture, setProfilePicture] = useState(null);

    // Los mensajes se restauran localmente solo en CV Maker. En IA Coach, vienen de BD.
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(true);
    const [isListening, setIsListening] = useState(false);

    // Referencias
    const messagesEndRef = useRef(null);
    const inputRef       = useRef(null);
    const recognitionRef = useRef(null);
    const isInterviewModeRef = useRef(isInterviewMode);
    const sendMessageRef = useRef(null);
    const silenceTimerRef = useRef(null);
    const prevInputRef = useRef('');

    // Actualizar referencias en cada render para prevenir stale closures en eventos
    isInterviewModeRef.current = isInterviewMode;

    // 2. Auto-scroll
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    // Persistir mensajes en localStorage *solo* para modo CV
    useEffect(() => {
        if (isCvMode && messages.length > 0) {
            localStorage.setItem('nextapp_cv_messages', JSON.stringify(messages));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [messages, isCvMode]);

    // Persistir datos del CV en localStorage (modo CV)
    useEffect(() => {
        if (isCvMode && Object.keys(cvData).length > 0) {
            localStorage.setItem('nextapp_cv_data', JSON.stringify(cvData));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cvData]);

    // Reenfocar el input tras cada respuesta de la IA (evita pérdida de foco)
    useEffect(() => {
        if (!isTyping && !isInterviewMode) {
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isTyping, isInterviewMode]);

    // Auto-envío del contexto de empleo tras recibir el saludo inicial (o historial de BD)
    useEffect(() => {
        if (
            messages.length > 0 &&
            !isTyping &&
            pendingJobPrepRef.current &&
            sendMessageRef.current
        ) {
            const job = pendingJobPrepRef.current;
            pendingJobPrepRef.current = null;
            // Si el prompt ya fue pre-procesado en JobHunter, usarlo directamente
            const prompt = job._processedPrompt || (
                `Quiero prepararme para aplicar a esta oferta laboral:\n\n` +
                `**Cargo:** ${job.job_title || 'No especificado'}\n` +
                `**Empresa:** ${job.employer_name || 'No especificada'}\n` +
                `**Ubicaci\u00f3n:** ${[job.job_city, job.job_country].filter(Boolean).join(', ') || 'No especificada'}\n` +
                `**Tipo de contrato:** ${job.job_employment_type || 'No especificado'}\n` +
                `**Descripci\u00f3n:** ${(job.job_description || 'No disponible').slice(0, 700)}\n\n` +
                `\u00bfC\u00f3mo debo prepararme? Dame un an\u00e1lisis estrat\u00e9gico: habilidades a destacar, preguntas probables de entrevista y c\u00f3mo cerrar brechas de habilidades.`
            );
            sendMessageRef.current(null, prompt);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [messages, isTyping]);

    // 3. Inicializar chat: restaurar sesión (DB en IA Coach, localStorage en CV Maker) o Saludo inicial
    useEffect(() => {
        let cancelled = false;

        const initializeChat = async () => {
            if (isCvMode) {
                // Modo CV Maker: recuperar de localStorage
                try {
                    const saved = localStorage.getItem('nextapp_cv_messages');
                    const parsed = saved ? JSON.parse(saved) : [];
                    if (parsed.length > 0) {
                        if (!cancelled) {
                            setMessages(parsed);
                            setIsTyping(false);
                            return;
                        }
                    }
                } catch { /* Ignorar error */ }
                // Si no hay local, buscar init del server
                fetchInitGreeting();
            } else {
                // Modo IA Coach: persistencia en la BD
                try {
                    const { data } = await axiosInstance.get('/coach/history');
                    if (cancelled) return;
                    if (data.history && data.history.length > 0) {
                        setMessages(data.history);
                        setIsTyping(false);
                    } else {
                        fetchInitGreeting();
                    }
                } catch (error) {
                    if (cancelled) return;
                    console.error('[ChatCoach] Error cargando DB history:', error);
                    fetchInitGreeting(); // fallback error
                }
            }
        };

        const fetchInitGreeting = async () => {
            try {
                const modeParam = isCvMode ? `?mode=createcv&templateId=${encodeURIComponent(templateId)}` : '';
                const { data } = await axiosInstance.get(`/coach/init${modeParam}`);
                if (cancelled) return;
                const greetingText = data.reply || (isCvMode
                    ? '¡Hola! Soy tu asistente de creación de CV de NEXT. Empieza contándome tu nombre completo.'
                    : '¡Hola! Soy tu IA Coach de NEXT. ¿En qué te puedo ayudar?');
                setMessages([{
                    id: 'init',
                    text: greetingText,
                    sender: 'ai'
                }]);
            } catch (error) {
                if (cancelled) return;
                console.error('[ChatCoach] Error al obtener saludo inicial:', error);
                // Fallback genérico si el endpoint falla
                setMessages([{
                    id: 'init',
                    text: isCvMode
                        ? '¡Hola! Soy tu asistente de creación de CV de NEXT. Empieza contándome tu nombre completo.'
                        : '¡Hola! Soy tu IA Coach de NEXT. Estoy listo para ayudarte con tu preparación profesional. ¿Empezamos?',
                    sender: 'ai'
                }]);
            } finally {
                if (!cancelled) setIsTyping(false);
            }
        };

        setIsTyping(true);
        initializeChat();

        // Cleanup: marca la invocación como cancelada cuando StrictMode desmonta
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isCvMode, templateId]);

    // Carga la foto de perfil del usuario al entrar en modo CV (para la vista previa)
    useEffect(() => {
        if (!isCvMode) return;
        axiosInstance.get('/user/profile')
            .then(r => setProfilePicture(r.data.profilePicture || null))
            .catch(() => {});
    }, [isCvMode]);

    // ── FIX BUG 3: Cleanup al desmontar el componente ────────────────────────
    // Garantiza que el TTS y el micrófono se detengan al navegar a otra página
    useEffect(() => {
        return () => {
            // Cancelar voz sintética inmediatamente al salir de la página
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
            // Detener el reconocimiento de voz si está activo
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
            // Limpiar timer de silencio pendiente
            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
            }
        };
    }, []);

    // 3. Inicializar Web Speech API (Recognition)
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.lang = 'es-ES';
            recognitionRef.current.interimResults = true;

            recognitionRef.current.onresult = (event) => {
                // Acumulador temporal para toda la sesión actual de voz
                const sessionTranscript = Array.from(event.results)
                    .map(result => result[0].transcript)
                    .join('');

                // 1. Mostrar texto acumulado en tiempo real en UI
                if (isInterviewModeRef.current) {
                    setInput(sessionTranscript);
                } else {
                    setInput((prevInputRef.current ? prevInputRef.current + ' ' : '') + sessionTranscript);
                }

                // 2. Limpiar timer anterior (Debounce)
                if (silenceTimerRef.current) {
                    clearTimeout(silenceTimerRef.current);
                }

                // 3. Iniciar nuevo timer de paciencia (1250ms = flujo conversacional natural)
                silenceTimerRef.current = setTimeout(() => {
                    const textToSend = sessionTranscript.trim();
                    if (isInterviewModeRef.current && sendMessageRef.current && textToSend) {
                        sendMessageRef.current(null, textToSend);
                        setInput('');
                        recognitionRef.current?.stop();
                    } else if (!isInterviewModeRef.current) {
                        // En chat normal, detener escucha y dejar texto listo para enviar
                        recognitionRef.current?.stop();
                    }
                }, 1500);
            };

            recognitionRef.current.onerror = (event) => {
                console.error("Error en Speech recognition: ", event.error);
                setIsListening(false);
                if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
                if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            };
        } else {
            console.warn("Speech Recognition API no soportada en este navegador.");
        }
    }, []);

    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        } else {
            // Empezar a escuchar (O intentarlo solicitando permisos si es la primera vez)
            try {
                if ('speechSynthesis' in window) {
                    window.speechSynthesis.cancel(); // Interrupción: detener al coach si el usuario empieza a hablar
                }

                // Pedir permiso explícitamente vía web navigator para asegurar UI si no se han resuelto
                navigator.mediaDevices.getUserMedia({ audio: true }).then(() => {
                    prevInputRef.current = input; // Guardamos lo que ya se había escrito
                    recognitionRef.current?.start();
                    setIsListening(true);
                }).catch(err => {
                    console.error("Permiso de micrófono denegado:", err);
                    alert("Para la simulación necesitas otorgar permisos de Micrófono en el navegador.");
                });

            } catch (e) {
                console.error(e);
            }
        }
    };

    // 4. Utilidad Anti-Markdown para TTS
    const cleanTextForSpeech = (text) => {
        return text
            .replace(/\*\*/g, '') // Quita negritas
            .replace(/\*/g, '')   // Quita cursivas o viñetas de asterisco
            .replace(/#/g, '')    // Quita los headers de markdown
            .replace(/-/g, '')    // Quita guiones sueltos
            .replace(/_/g, '')    // Quita subrayados markdown
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Reemplaza links [texto](url) solo por texto
            .trim();
    };

    // 5. Función de Text-to-Speech (Coach Voz) — Google Cloud TTS Neural2 (vía Backend)
    const speakText = async (text) => {
        const cleanText = cleanTextForSpeech(text);
        if (!cleanText) return;

        // ─ Detener cualquier audio previo ───────────────────────────────
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = '';
        }

        try {
            const response = await axiosInstance.post(
                '/coach/tts',
                { text: cleanText }, // El backend ya sabe que es Google TTS
                { responseType: 'arraybuffer' }
            );

            const blob = new Blob([response.data], { type: 'audio/mpeg' });
            
            if (blob.size < 100) {
                 throw new Error(`Error en el TTS, audio vacío`);
            }

            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audioRef.current = audio;
            audio.onended = () => URL.revokeObjectURL(url);
            audio.play();
        } catch (err) {
            console.error('[TTS Google Cloud] Error:', err);
        }
    };


    // 6.5  Fusiona datos parciales del CV para la vista previa en tiempo real
    const mergeCvData = (prev, next) => ({
        ...prev, ...next,
        personalInfo: { ...(prev.personalInfo || {}), ...(next.personalInfo || {}) },
        skills:       { ...(prev.skills || {}),       ...(next.skills || {}) },
        education:    (next.education?.length  > 0) ? next.education  : (prev.education  || []),
        experience:   (next.experience?.length > 0) ? next.experience : (prev.experience || []),
        languages:    (next.languages?.length  > 0) ? next.languages  : (prev.languages  || []),
        workReferences: (next.workReferences?.length > 0) ? next.workReferences : (prev.workReferences || []),
        personalReferences: (next.personalReferences?.length > 0) ? next.personalReferences : (prev.personalReferences || []),
    });

    // 6.6  Guarda los datos del CV en la base de datos (el PDF lo genera el frontend)
    const saveCvData = async (cvJson) => {
        try {
            const payload = { ...cvJson, templateId: cvJson.templateId || selectedTemplate };
            await axiosInstance.post('/cv/save', payload);
            setCvModal({ status: 'ready' });
        } catch (err) {
            console.error('[saveCvData]', err);
            setCvModal({ status: 'error' });
        }
    };

    // 6.7  Callback llamado por la plantilla tras exportar el PDF por primera vez
    const handleFirstExport = () => {
        if (isCvMode) setExportModal('confirm');
    };

    // Eliminar historial de conversación del IA Coach desde la BD
    const deleteConversation = async () => {
        if (!window.confirm('\u00bfEliminar toda la conversación? Esta acción no se puede deshacer.')) return;
        try {
            await axiosInstance.delete('/coach/history');
        } catch (err) {
            console.error('[deleteConversation]', err);
        }
        setMessages([]);
        setIsTyping(true);
        // Solicitar nuevo saludo
        try {
            const { data } = await axiosInstance.get('/coach/init');
            setMessages([{ id: 'init', text: data.reply || '¡Hola! Soy tu IA Coach de NEXT. ¿En qué te puedo ayudar?', sender: 'ai' }]);
        } catch {
            setMessages([{ id: 'init', text: '¡Hola! Soy tu IA Coach. ¿En qué puedo ayudarte hoy?', sender: 'ai' }]);
        } finally {
            setIsTyping(false);
        }
    };

    // Limpia toda la memoria de la sesión local (útil para CV mode) y vuelve al dashboard
    const clearSessionAndExit = () => {
        localStorage.removeItem('nextapp_cv_messages');
        localStorage.removeItem('nextapp_cv_data');
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        navigate('/dashboard');
    };

    // 6. Función para enviar mensajes (Chat normal o Simulación)
    const sendMessage = async (e, textOverride = null) => {
        e?.preventDefault();

        const textToSend = textOverride !== null ? textOverride : input.trim();
        if (!textToSend) return;

        // Limpiar el input local y mostrar el mensaje en la UI
        const newUserMsg = { id: Date.now().toString(), text: textToSend, sender: 'user' };
        setMessages((prev) => [...prev, newUserMsg]);
        setInput('');
        setIsTyping(true);

        try {
            const requestBody = {
                message: textToSend,
                history: messages.filter(m => m.id !== 'init' && !m.isError),
                isInterviewMode,
                isCvMode,
                templateId: selectedTemplate,
            };

            // El interceptor adjunta el token y gestiona el error 401 automáticamente
            const { data } = await axiosInstance.post('/coach/chat', requestBody);
            const aiReplyText = data.reply || 'No pude procesar tu solicitud, intenta de nuevo';

            // ── Extracción de datos parciales del CV (actualiza la vista previa) ──
            let displayText = aiReplyText;
            if (isCvMode) {
                const partialMatch = aiReplyText.match(/\[CV_PARTIAL\]([\s\S]*?)\[\/CV_PARTIAL\]/);
                if (partialMatch) {
                    try {
                        const partialJson = JSON.parse(partialMatch[1].trim());
                        setCvData(prev => mergeCvData(prev, partialJson));
                    } catch { /* ignorar errores de parseo parcial */ }
                }
                displayText = aiReplyText.replace(/\[CV_PARTIAL\][\s\S]*?\[\/CV_PARTIAL\]/g, '').trim();
            }

            // ── Detección de datos finales de CV ─────────────────────────────
            if (isCvMode && displayText.includes('[CV_FINAL_DATA]')) {
                const match = displayText.match(/\[CV_FINAL_DATA\]([\s\S]*?)\[\/CV_FINAL_DATA\]/);
                if (match) {
                    try {
                        const cvJson = JSON.parse(match[1].trim());
                        const cleanReply = displayText.split('[CV_FINAL_DATA]')[0].trim() ||
                            '¡Perfecto! He recolectado toda la información. Tu CV está listo en la vista previa.';
                        setMessages(prev => [...prev, {
                            id: (Date.now() + 1).toString(),
                            text: cleanReply,
                            sender: 'ai',
                        }]);
                        setCvData(cvJson);
                        setCvModal({ status: 'generating' });
                        saveCvData(cvJson);
                        return; // finally{} aún ejecuta setIsTyping(false)
                    } catch (parseErr) {
                        console.error('[ChatCoach] CV JSON parse error:', parseErr);
                        // fall-through: mostrar el mensaje normal
                    }
                }
            }

            // Añadir la respuesta de la IA
            const aiMsg = {
                id: (Date.now() + 1).toString(),
                text: displayText,
                sender: 'ai'
            };

            setMessages((prev) => [...prev, aiMsg]);

            // Si es entrevista, el coach reacciona usando su voz
            // Regla de Silencio: NUNCA leer en voz alta los reportes finales ni hablar si ya terminó la simulación
            if (isInterviewMode && !displayText.includes('REPORTE') && !displayText.includes('Reporte')) {
                speakText(displayText);
            }

        } catch (error) {
            console.error('Error al comunicarse con el IA Coach:', error);

            // 401 ya es manejado por el interceptor (limpia sesión y redirige a /login)
            if (error.response?.status === 401) return;

            const errorMsg =
                error.response?.data?.error ||
                (error.response?.status === 429
                    ? 'Demasiadas solicitudes. Espera un momento e intenta de nuevo.'
                    : 'Hubo un error al conectar con el servidor. Verifica tu conexión o intenta más tarde.');

            setMessages((prev) => [
                ...prev,
                {
                    id: (Date.now() + 1).toString(),
                    text: errorMsg,
                    sender: 'ai',
                    isError: true
                }
            ]);
        } finally {
            setIsTyping(false);
        }
    };

    // Actualizar referencia de sendMessage para que Web Speech API pueda usar su versión final
    sendMessageRef.current = sendMessage;

    // 7. Activar Modo Simulación — saludo personalizado vía Gemini
    const startInterview = async () => {
        if (isCvMode) return; // No permitir entrevista en modo CV
        setIsInterviewMode(true);
        setIsTyping(true);

        try {
            // Reutilizamos /coach/init pero le indicamos al backend que es modo entrevista
            // a través de un query param para que el prompt sea el de reclutador
            const { data } = await axiosInstance.get('/coach/init?mode=interview');
            const initText = data.reply || `¡Perfecto! Iniciemos la simulación. Soy tu reclutador. Cuéntame sobre tu experiencia en tu área.`;

            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                text: initText,
                sender: 'ai'
            }]);

            // Leer en voz alta solo si el texto NO es un reporte
            speakText(initText);

        } catch (error) {
            console.error('[startInterview] Error al obtener saludo de entrevista:', error);
            const fallbackText = `¡Perfecto! Iniciemos la simulación. Soy tu reclutador. Cuéntame sobre tu experiencia y tus principales habilidades.`;
            setMessages(prev => [...prev, { id: Date.now().toString(), text: fallbackText, sender: 'ai' }]);
            speakText(fallbackText);
        } finally {
            setIsTyping(false);
        }
    };

    // 8. Finalizar Simulación Forzosamente
    const stopInterview = async () => {
        // Detener voz y escucha inmediatamente
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        if (recognitionRef.current) recognitionRef.current.abort();
        setIsListening(false);
        setIsInterviewMode(false);

        // ── FIX BUG 2: Contar respuestas REALES del usuario en esta sesión ────
        // Excluimos el mensaje 'init' del chat y el mensaje de inicio de entrevista (sender:'ai')
        const userTurns = messages.filter(m => m.sender === 'user').length;

        if (userTurns === 0) {
            // El usuario cerró sin hablar: no generar reporte, solo notificar
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                text: 'áSimulación cerrada! No hubo suficiente conversación para generar un reporte. Cuando estés listo, puedes iniciar una nueva simulación.',
                sender: 'ai'
            }]);
            return; // ← salir sin llamar al backend
        }

        // Sólo llega aquí si el usuario respondió al menos 1 vez
        sendMessage(null, 'He decidido finalizar la simulación. Genera el reporte de mi desempeño considerando lo que hemos conversado.');
    };

    return (
        <>
        <div className="cv-print-main relative flex h-[100svh] min-h-[100svh] w-full overflow-hidden bg-white font-sans md:h-dvh md:min-h-dvh">

            {/* ── COLUMNA IZQUIERDA (60%): CHAT & INPUT ── */}
            <div className="cv-print-chat relative z-10 flex h-full min-h-0 w-full flex-1 flex-col border-r border-gray-100 bg-white shadow-[2px_0_15px_rgba(0,0,0,0.02)] lg:w-[60%] lg:flex-none">

                {/* Header (Nav interno) */}
                <div className="h-16 flex items-center px-4 sm:px-6 border-b border-gray-100 flex-shrink-0 gap-2">
                    <button
                        onClick={() => {
                            if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                            
                            // Mostrar alerta de salida solo si estamos en CV mode con progreso
                            if (isCvMode && messages.length > 2) {
                                setShowExitModal(true);
                            } else {
                                navigate('/dashboard');
                            }
                        }}
                        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#2563EB] transition-colors cursor-pointer flex-shrink-0"
                    >
                        <ChevronLeft size={16} />
                        <span className="hidden sm:inline">Volver al Dashboard</span>
                    </button>

                    {/* Botón CV preview — solo visible en móvil en modo CV */}
                    <div className="lg:hidden flex-1 flex justify-center">
                        {isCvMode ? (
                            <button
                                onClick={() => setShowMobilePreview(true)}
                                className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 px-3 py-1.5 rounded-full transition-all cursor-pointer"
                            >
                                <FileText size={13} /> Ver mi CV
                            </button>
                        ) : isInterviewMode ? (
                            <button
                                onClick={stopInterview}
                                className="flex items-center gap-1.5 text-xs font-semibold text-red-500 border border-red-200 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-full transition-all cursor-pointer"
                            >
                                <SquareSquare size={13} /> Finalizar Simulación
                            </button>
                        ) : (
                            <button
                                onClick={startInterview}
                                disabled={isTyping}
                                className="flex items-center gap-1.5 text-xs font-semibold text-white px-3 py-1.5 rounded-full transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ background: 'linear-gradient(to right, #2563EB, #22D3EE)' }}
                            >
                                <PlayCircle size={13} /> Simular Entrevista
                            </button>
                        )}
                    </div>

                    <div className="ml-auto lg:ml-0 flex items-center gap-2">
                        {/* Botón borrar conversación — solo en IA Coach (no CV mode, no entrevista) */}
                        {!isCvMode && !isInterviewMode && (
                            <button
                                onClick={deleteConversation}
                                title="Eliminar conversación"
                                className="flex items-center gap-1.5 text-xs text-gray-400 border border-gray-200 hover:border-red-300 hover:text-red-500 hover:bg-red-50 rounded-xl px-3 py-1.5 transition-all cursor-pointer"
                            >
                                <Trash2 size={12} /> <span className="hidden sm:inline">Borrar chat</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* CONTENIDO VARIABLE SEGÚN MODO: Chat vs UI de Llamada */}
                {!isInterviewMode ? (
                    <>
                        {/* Área de mensajes con scroll encapsulado */}
                        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto bg-slate-50 px-4 py-5 sm:px-6 sm:py-6">
                            {messages.map((msg) => {
                                const isUser = msg.sender === 'user';
                                return (
                                    <div key={msg.id} className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`flex max-w-[85%] sm:max-w-[75%] gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>

                                            {/* Avatar */}
                                            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-auto shadow-sm ${isUser ? 'bg-blue-100 text-blue-600' : 'bg-gray-800 text-white'}`}>
                                                {isUser ? <User size={14} /> : <Bot size={14} />}
                                            </div>

                                            {/* Burbuja / Markdown Render */}
                                            <div className={`px-5 py-3.5 rounded-[1.25rem] text-[15px] leading-relaxed break-words shadow-sm overflow-hidden min-w-[50px]
                                                ${isUser
                                                    ? 'bg-[#1E3A8A] text-white font-medium rounded-br-none' // bg-blue-900 
                                                    : msg.isError
                                                        ? 'bg-red-50 text-red-600 border border-red-100 rounded-bl-none'
                                                        : 'bg-white text-slate-800 border border-gray-100 rounded-bl-none font-normal'
                                                }`}
                                            >
                                                <div className={`prose prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-gray-800 prose-pre:text-white prose-headings:font-bold prose-headings:text-gray-900 prose-li:my-0.5 ${isUser ? 'prose-invert prose-p:text-white text-white' : 'text-slate-800'}`}>
                                                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Indicador de "Escribiendo..." */}
                            {isTyping && (
                                <div className="flex w-full justify-start animate-fade-in mb-4">
                                    <div className="flex gap-2 flex-row">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center mt-auto shadow-sm">
                                            <Bot size={14} className="text-white" />
                                        </div>
                                        <div className="px-5 py-3.5 bg-white border border-gray-100 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                                            <span className="text-xs text-gray-400 ml-1.5 font-medium">
                                                Analizando respuesta...
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        {/* Área de Input Fija al fondo del 60% */}
                        <div
                            className="sticky bottom-0 mt-auto flex-shrink-0 border-t border-gray-100 bg-white p-4 sm:p-6"
                            style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
                        >
                            <form onSubmit={sendMessage} className="flex gap-3 items-center">
                                {/* Botón de Voz (Micrófono) */}
                                <button
                                    type="button"
                                    onClick={toggleListening}
                                    aria-label="Hablarle al Coach"
                                    className={`flex flex-shrink-0 items-center justify-center w-12 h-12 rounded-xl transition-all cursor-pointer ${isListening
                                        ? 'bg-red-50 text-red-500 border border-red-200 shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-pulse'
                                        : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100 hover:text-blue-600'
                                        }`}
                                >
                                    {isListening ? <MicOff size={22} className="opacity-80" /> : <Mic size={22} className="opacity-80" />}
                                </button>

                                <div className="relative flex-1">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder={isListening ? "Te estoy escuchando..." : "Escribe tu duda técnica o respuesta aquí..."}
                                        disabled={isTyping}
                                        className={`w-full bg-slate-50 border text-gray-800 text-[15px] rounded-xl pl-4 pr-12 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed ${isListening ? 'border-red-200 placeholder-red-300' : 'border-gray-200 focus:border-[#2563EB]'
                                            }`}
                                    />
                                </div>

                                {/* Botón de Enviar */}
                                <button
                                    type="submit"
                                    disabled={!input.trim() || isTyping}
                                    className="flex flex-shrink-0 items-center justify-center w-12 h-12 bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    {isTyping ? <Loader2 size={20} className="animate-spin text-white/80" /> : <Send size={20} className="ml-0.5" />}
                                </button>
                            </form>
                            <p className="text-center text-[10px] text-gray-400 mt-3 font-medium tracking-wide">
                                POTENCIADO POR GEMINI AI
                            </p>
                        </div>
                    </>
                ) : (
                    <div className="flex min-h-0 flex-1 flex-col items-center justify-between overflow-y-auto bg-slate-50 px-4 py-6 sm:px-6 sm:py-8">
                        {/* Centro: icono + estado */}
                        <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 py-4">
                            <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center bg-white shadow-xl ${isListening ? 'shadow-red-500/30' : 'shadow-blue-500/20'}`}>
                                {isTyping ? <Activity size={36} className="text-[#2563EB] animate-pulse" /> : isListening ? <Mic size={36} className="text-red-500 animate-pulse" /> : <Bot size={36} className="text-gray-800" />}
                            </div>
                            <div>
                                <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Entrevista en curso</h2>
                                <p className="text-gray-500 text-sm sm:text-base max-w-xs sm:max-w-sm">
                                    {isListening ? 'Te estoy escuchando. Responde en voz alta y seré todo oídos.' : isTyping ? 'El Reclutador está procesando tu respuesta...' : 'Presiona el micrófono inferior para hablar.'}
                                </p>
                            </div>

                            {/* Simulador de Frecuencia Audio */}
                            <div className="flex items-center justify-center gap-1 h-10 sm:h-12">
                                {[...Array(8)].map((_, i) => (
                                    <div
                                        key={i}
                                        className={`w-1.5 rounded-full ${isTyping ? 'bg-blue-500' : isListening ? 'bg-red-500' : 'bg-gray-300'} transition-all duration-300`}
                                        style={{ height: (isListening || isTyping) ? `${Math.max(10, Math.random() * 40 + 10)}px` : '4px', animation: (isListening || isTyping) ? `pulse 1s infinite ${i * 0.1}s` : 'none' }}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Controles inferiores */}
                        <div className="w-full max-w-sm mx-auto flex flex-col gap-3">
                            <button
                                onClick={toggleListening}
                                className={`w-full py-3.5 sm:py-4 rounded-2xl font-bold flex flex-col items-center justify-center gap-1 transition-all shadow-lg active:scale-95 cursor-pointer ${isListening ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-[#2563EB] text-white hover:bg-blue-700'}`}
                            >
                                {isListening ? <MicOff size={24} /> : <Mic size={24} />}
                                <span>{isListening ? 'Terminar de Hablar' : 'Pulsar para Hablar'}</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── COLUMNA DERECHA (40%): CV Preview (modo CV) o Interactive Hub ── */}
            {isCvMode ? (
                <div className="cv-print-wrap hidden lg:flex w-[40%] h-full min-h-0 flex-col border-l border-gray-100 overflow-hidden">
                    <TemplateManager
                        templateId={selectedTemplate}
                        cvData={cvData}
                        profilePicture={profilePicture}
                        onChangeTemplate={setSelectedTemplate}
                        onFirstExport={handleFirstExport}
                    />
                </div>
            ) : (
            <div className="hidden lg:flex w-[40%] h-full min-h-[500px] flex-col bg-gradient-to-br from-[#0B1120] to-[#1E293B] relative overflow-hidden">

                {/* Ambientes decorativos y blur */}
                <div className="absolute top-[-20%] left-[-10%] w-[120%] h-[120%] bg-[radial-gradient(ellipse_at_center,rgba(37,99,235,0.15),transparent_70%)] pointer-events-none" />

                {/* Header de Estado */}
                <div className="absolute top-8 left-8 right-8 flex justify-between items-start z-10">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2.5 bg-white/5 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-white shadow-lg shadow-black/20 w-max">
                            <span className={`w-2 h-2 rounded-full ${isTyping ? 'bg-yellow-400 animate-pulse' : isListening ? 'bg-red-500 animate-pulse' : 'bg-green-400'}`} />
                            <span className="text-sm font-medium tracking-wide">
                                {isTyping ? 'Coach analizando...' : isListening ? 'Coach escuchando...' : 'Coach en línea'}
                            </span>
                        </div>
                        {isInterviewMode && (
                            <div className="bg-blue-500/10 text-blue-300 border border-blue-500/20 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest w-max animate-fade-in-up">
                                Modo: Entrevista Técnica
                            </div>
                        )}
                        {isCvMode && (
                            <div className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest w-max animate-fade-in-up">
                                Modo: Crear CV
                            </div>
                        )}
                    </div>
                </div>

                {/* Contenedor Spline 3D (Hub Físico) */}
                <div className="flex-1 flex items-center justify-center relative z-0 w-full overflow-hidden">
                    {/* Background glow para darle realismo a su "Branding" o presencia */}
                    <div className="absolute inset-x-0 bottom-1/4 flex flex-col items-center justify-center pointer-events-none">
                        <div className={`w-80 h-80 bg-gradient-to-tr from-[#1B49AE] to-[#22D3EE] rounded-full blur-[100px] mix-blend-screen transition-all duration-700 ${isTyping ? 'opacity-80 scale-110 bg-yellow-400' : isListening ? 'opacity-80 bg-red-500 scale-90' : 'opacity-40 animate-pulse'}`} />
                    </div>

                    {/* Robot splint 3D ajustado y animado por estados */}
                    <div className={`relative w-full h-[70%] max-h-[500px] flex justify-center items-center z-10 transition-transform duration-700 pointer-events-auto ${isTyping ? 'scale-[1.05] drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]' : isListening ? 'scale-95 drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]' : 'scale-100 drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]'}`}>
                        <div className="w-full h-full scale-90 lg:scale-100 relative top-10 pointer-events-none">
                            <Robot3D />
                        </div>
                    </div>
                </div>

                {/* Panel de Acción Inferior */}
                <div className="absolute bottom-8 left-8 right-8 z-10">
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem] text-center shadow-2xl">
                        {isCvMode ? (
                            <>
                                <h3 className="text-white text-lg font-bold mb-2">Creador de CV con IA</h3>
                                <p className="text-gray-400 text-sm mb-4 leading-relaxed px-4">
                                    Responde las preguntas del asistente paso a paso para generar tu CV profesional con diseño Harvard.
                                </p>
                                <div className="py-3 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm font-semibold">
                                    Sesión de creación en curso →
                                </div>
                            </>
                        ) : (
                            <>
                                <h3 className="text-white text-lg font-bold mb-2">Simulador de Entrevistas</h3>
                                <p className="text-gray-400 text-sm mb-6 leading-relaxed px-4">
                                    Mide tus habilidades con preguntas técnicas en vivo.
                                    Responde usando tu micrófono y obtén retroalimentación inmediata.
                                </p>
                                {isInterviewMode ? (
                                    <button
                                        onClick={stopInterview}
                                        className="w-full py-4 rounded-2xl font-bold transition-all shadow-[0_0_20px_rgba(239,68,68,0.4)] active:scale-95 flex items-center justify-center gap-2 cursor-pointer bg-red-500/10 border border-red-500 hover:bg-red-500 text-white"
                                    >
                                        <SquareSquare size={20} className="mb-0.5" />
                                        Finalizar Simulación
                                    </button>
                                ) : (
                                    <button
                                        onClick={startInterview}
                                        className="w-full py-4 rounded-2xl font-bold transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                                        style={{ background: 'linear-gradient(to right, #2563EB, #22D3EE)', color: '#fff' }}
                                    >
                                        <PlayCircle size={20} className="mb-0.5" />
                                        Iniciar Simulación de Entrevista
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>

            </div>
            )}

        </div>

        {/* ── MOBILE CV PREVIEW OVERLAY ─────────────────────────────────────── */}
        {isCvMode && showMobilePreview && (
            <div className="cv-print-hide lg:hidden fixed inset-0 z-50 flex min-h-0 flex-col bg-white">
                {/* Header del overlay */}
                <div className="flex items-center justify-between px-4 h-14 border-b border-gray-100 flex-shrink-0">
                    <span className="text-sm font-bold text-gray-700">Vista previa del CV</span>
                    <button
                        onClick={() => setShowMobilePreview(false)}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                        <X size={18} className="text-gray-500" />
                    </button>
                </div>
                {/* TemplateManager ocupa el resto */}
                <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                    <TemplateManager
                        templateId={selectedTemplate}
                        cvData={cvData}
                        profilePicture={profilePicture}
                        onChangeTemplate={(id) => { setSelectedTemplate(id); }}
                        onFirstExport={handleFirstExport}
                    />
                </div>
            </div>
        )}

        {/* ── MODAL DE CONFIRMACIÓN DE SALIDA CV MAKER ────────────────────── */}
        {showExitModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative overflow-hidden animate-fade-in-up text-center">
                    <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle size={32} className="text-amber-500" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">¿Seguro que quieres salir?</h3>
                    <p className="text-gray-500 text-sm mb-6">
                        Tienes un proceso de creación de CV en curso. ¿Deseas mantener tu progreso para la próxima vez o empezar desde cero?
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 w-full">
                        <button
                            onClick={clearSessionAndExit}
                            className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer"
                        >
                            Borrar todo y salir
                        </button>
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer"
                        >
                            Guardar y salir
                        </button>
                    </div>
                    <button
                        onClick={() => setShowExitModal(false)}
                        className="mt-4 text-sm text-gray-400 hover:text-gray-600 font-medium cursor-pointer"
                    >
                        Cancelar, seguir aquí
                    </button>
                </div>
            </div>
        )}

        {/* ── MODAL DE GENERACIÓN DE CV ─────────────────────────────────────── */}
        {cvModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in">
                <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl">
                    {cvModal.status === 'generating' ? (
                        <>
                            <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 rounded-full bg-blue-50 flex items-center justify-center">
                                <Loader2 size={28} className="text-[#2563EB] animate-spin" />
                            </div>
                            <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-2">Guardando tu CV...</h3>
                            <p className="text-sm text-gray-500">Estamos guardando tu información en la nube.</p>
                        </>
                    ) : cvModal.status === 'ready' ? (
                        <>
                            <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 rounded-full bg-green-50 flex items-center justify-center">
                                <CheckCircle size={28} className="text-green-500" />
                            </div>
                            <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-2">¡CV guardado con éxito!</h3>
                            <p className="text-sm text-gray-500 mb-5">Tu CV está listo. Descárgalo en PDF desde la vista previa.</p>
                            <button
                                onClick={() => setCvModal(null)}
                                className="px-6 py-2.5 bg-[#2563EB] text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition cursor-pointer"
                            >
                                Continuar
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
                                <AlertCircle size={28} className="text-red-500" />
                            </div>
                            <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-2">Error al guardar el CV</h3>
                            <p className="text-sm text-gray-500 mb-5">Ocurrió un error. Intenta de nuevo más tarde.</p>
                            <button
                                onClick={() => setCvModal(null)}
                                className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-200 transition cursor-pointer"
                            >
                                Cerrar
                            </button>
                        </>
                    )}
                </div>
            </div>
        )}

        {/* ── MODAL POST-EXPORTACIÓN DE CV ──────────────────────────────────── */}
        {exportModal && (
            <div className="fixed inset-0 bg-black/50 z-60 flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
                    {exportModal === 'confirm' ? (
                        <>
                            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-emerald-50 flex items-center justify-center">
                                <CheckCircle size={28} className="text-emerald-500" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800 mb-2">¡CV exportado!</h3>
                            <p className="text-sm text-gray-500 mb-6">
                                ¿Deseas terminar la conversación y eliminar el progreso guardado?
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={clearSessionAndExit}
                                    className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold text-sm transition cursor-pointer"
                                >
                                    Sí, terminar
                                </button>
                                <button
                                    onClick={() => setExportModal('changes')}
                                    className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold text-sm transition cursor-pointer"
                                >
                                    No, continuar
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-blue-50 flex items-center justify-center">
                                <FileText size={28} className="text-blue-500" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800 mb-2">¿Hacer cambios?</h3>
                            <p className="text-sm text-gray-500 mb-6">
                                ¿Quieres pedirle a la IA que corrija o mejore algo en tu CV?
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setExportModal(null);
                                        setTimeout(() => {
                                            sendMessageRef.current?.(null, 'Quiero hacer algunos cambios a mi CV. ¿Puedes ayudarme?');
                                        }, 100);
                                    }}
                                    className="flex-1 py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition cursor-pointer"
                                >
                                    Sí, hacer cambios
                                </button>
                                <button
                                    onClick={() => setExportModal(null)}
                                    className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold text-sm transition cursor-pointer"
                                >
                                    No, cerrar
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        )}
        </>
    );
};

export default ChatCoach;
