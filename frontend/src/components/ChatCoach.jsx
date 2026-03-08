import { useState, useRef, useEffect } from 'react';
import { Bot, Send, User, Loader2, ChevronLeft, Mic, MicOff, PlayCircle, SquareSquare, Activity, CheckCircle, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useNavigate, useLocation } from 'react-router-dom';
import LogoNext from '../components/LogoNext';
import Robot3D from '../components/Robot3D';
import axiosInstance from '../api/axiosInstance';

const ChatCoach = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Detectar modo creación de CV desde query param ?mode=createcv
    const isCvMode = new URLSearchParams(location.search).get('mode') === 'createcv';
    // Plantilla seleccionada en CV Maker Hub — se propaga al backend en cada llamada
    const templateId = new URLSearchParams(location.search).get('templateId') || 'francisco';

    // Job HuNTER: si venimos con datos de un empleo, prepara el prompt automático
    const pendingJobPrepRef = useRef(location.state?.jobPrep || null);

    // 1. Estados
    const [isInterviewMode, setIsInterviewMode] = useState(false);

    // null = sin modal | { status: 'generating' | 'ready' | 'error' }
    const [cvModal, setCvModal] = useState(null);

    // El chat empieza vacío — el /init endpoint genera el saludo personalizado
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(true); // true → muestra el loader de bienvenida
    const [isListening, setIsListening] = useState(false);

    // Referencias
    const messagesEndRef = useRef(null);
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

    // Auto-envío del contexto de empleo tras recibir el saludo inicial
    useEffect(() => {
        if (
            messages.length === 1 &&
            messages[0].id === 'init' &&
            pendingJobPrepRef.current &&
            sendMessageRef.current
        ) {
            const job = pendingJobPrepRef.current;
            pendingJobPrepRef.current = null;
            const location = [job.job_city, job.job_country].filter(Boolean).join(', ');
            const prompt =
                `Quiero prepararme para aplicar a esta oferta laboral:\n\n` +
                `**Cargo:** ${job.job_title || 'No especificado'}\n` +
                `**Empresa:** ${job.employer_name || 'No especificada'}\n` +
                `**Ubicación:** ${location || 'No especificada'}\n` +
                `**Tipo de contrato:** ${job.job_employment_type || 'No especificado'}\n` +
                `**Descripción:** ${(job.job_description || 'No disponible').slice(0, 800)}\n\n` +
                `¿Cómo debería prepararme para obtener este empleo? Dime qué habilidades técnicas y blandas debo destacar, qué podrían preguntarme en la entrevista y qué puedo mejorar según los requisitos.`;
            sendMessageRef.current(null, prompt);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [messages]);

    // 3. Saludo personalizado — GET /api/coach/init
    // Usamos un flag `cancelled` para evitar que StrictMode (doble ejecución en dev)
    // resetee el historial cuando la primera llamada llega después de que la segunda ya terminó.
    useEffect(() => {
        let cancelled = false;

        const fetchInitGreeting = async () => {
            try {
                setIsTyping(true);
                const modeParam = isCvMode ? `?mode=createcv&templateId=${encodeURIComponent(templateId)}` : '';
                const { data } = await axiosInstance.get(`/coach/init${modeParam}`);
                if (cancelled) return; // StrictMode cleanup: ignorar respuesta de la invocación obsoleta
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

        fetchInitGreeting();

        // Cleanup: marca la invocación como cancelada cuando StrictMode desmonta
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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

    // 5. Función de Text-to-Speech (Coach Voz) — voz masculina en español
    const speakText = (text) => {
        if (!('speechSynthesis' in window)) return;

        window.speechSynthesis.cancel();
        const cleanText = cleanTextForSpeech(text);

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'es-ES';
        utterance.rate = 0.95;
        utterance.pitch = 0.80; // Tono bajo → percepción masculina

        // Nombres comunes para voces masculinas en español (Chrome, Linux, Safari, Windows)
        const MALE_VOICE_NAMES = [
            'Jorge', 'Carlos', 'Diego', 'Pablo', 'Juan', 'Miguel',
            'Enrique', 'Matias', 'Rodrigo', 'Martin', 'Alvaro', 'Andres',
            'David', 'Jose', 'Google español de Estados Unidos', 'Google español',
            'Spanish Male', 'Male', 'Español', 'es-us', 'es-mx', 'es-es'
        ];

        const assignVoice = () => {
            const voices = window.speechSynthesis.getVoices();
            if (voices.length === 0) return false;

            // 1. Priorizar por nombres conocidos de hombre + idioma español
            let selected = voices.find(v =>
                v.lang.startsWith('es') &&
                MALE_VOICE_NAMES.some(name => v.name.toLowerCase().includes(name.toLowerCase()))
            );

            // 2. Fallback: cualquier voz española que no sea claramente femenina
            if (!selected) {
                selected = voices.find(v =>
                    v.lang.startsWith('es') &&
                    (v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('hombre'))
                ) || voices.find(v => v.lang.startsWith('es'));
            }

            if (selected) {
                utterance.voice = selected;
                // Si la voz parece femenina por nombre, bajamos el pitch para masculinizarla
                const nameLow = selected.name.toLowerCase();
                const isLikelyFemale = nameLow.includes('female') || nameLow.includes('woman') ||
                    nameLow.includes('elena') || nameLow.includes('lucia') ||
                    nameLow.includes('monica') || nameLow.includes('paulina') ||
                    nameLow.includes('sabina') || nameLow.includes('helena');
                utterance.pitch = isLikelyFemale ? 0.55 : 0.85;
                console.debug('[TTS] Voz configurada (masculina):', selected.name);
            } else {
                utterance.pitch = 0.70; // Fallback grave para tono masculino
            }
            return true;
        };

        if (!assignVoice()) {
            window.speechSynthesis.onvoiceschanged = () => {
                assignVoice();
                window.speechSynthesis.speak(utterance);
                window.speechSynthesis.onvoiceschanged = null;
            };
        } else {
            window.speechSynthesis.speak(utterance);
        }
    };

    // 6.5  Genera y descarga el archivo Word del CV llamando al backend
    const generateAndDownloadCv = async (cvData) => {
        try {
            // Preserve templateId from URL if the AI didn't inject it in the JSON
            const payload = { ...cvData, templateId: cvData.templateId || templateId };
            const response = await axiosInstance.post('/cv/generate', payload, {
                responseType: 'blob',
            });
            const blob = new Blob([response.data], {
                type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `CV_${(payload.personalInfo?.name || 'MiCV').replace(/\s+/g, '_')}.docx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            setCvModal({ status: 'ready' });
        } catch (err) {
            console.error('[generateAndDownloadCv]', err);
            setCvModal({ status: 'error' });
        }
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
                templateId,
            };

            // El interceptor adjunta el token y gestiona el error 401 automáticamente
            const { data } = await axiosInstance.post('/coach/chat', requestBody);
            const aiReplyText = data.reply || 'No pude procesar tu solicitud, intenta de nuevo';

            // ── Detección de datos finales de CV ─────────────────────────────
            if (isCvMode && aiReplyText.includes('[CV_FINAL_DATA]')) {
                const match = aiReplyText.match(/\[CV_FINAL_DATA\]([\s\S]*?)\[\/CV_FINAL_DATA\]/);
                if (match) {
                    try {
                        const cvJson = JSON.parse(match[1].trim());
                        const cleanReply = aiReplyText.split('[CV_FINAL_DATA]')[0].trim() ||
                            '¡Perfecto! He recolectado toda la información. Generando tu CV profesional ahora...';
                        setMessages(prev => [...prev, {
                            id: (Date.now() + 1).toString(),
                            text: cleanReply,
                            sender: 'ai',
                        }]);
                        setCvModal({ status: 'generating' });
                        generateAndDownloadCv(cvJson);
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
                text: aiReplyText,
                sender: 'ai'
            };

            setMessages((prev) => [...prev, aiMsg]);

            // Si es entrevista, el coach reacciona usando su voz
            // Regla de Silencio: NUNCA leer en voz alta los reportes finales ni hablar si ya terminó la simulación
            if (isInterviewMode && !aiReplyText.includes('REPORTE') && !aiReplyText.includes('Reporte')) {
                speakText(aiReplyText);
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
        <div className="relative flex h-[100svh] min-h-[100svh] w-full overflow-hidden bg-white font-sans md:h-dvh md:min-h-dvh">

            {/* ── COLUMNA IZQUIERDA (60%): CHAT & INPUT ── */}
            <div className="relative z-10 flex h-full min-h-0 w-full flex-1 flex-col border-r border-gray-100 bg-white shadow-[2px_0_15px_rgba(0,0,0,0.02)] lg:w-[60%] lg:flex-none">

                {/* Header (Nav interno) */}
                <div className="h-16 flex items-center px-4 sm:px-6 border-b border-gray-100 flex-shrink-0 gap-2">
                    <button
                        onClick={() => {
                            if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                            navigate('/dashboard');
                        }}
                        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#2563EB] transition-colors cursor-pointer flex-shrink-0"
                    >
                        <ChevronLeft size={16} />
                        <span className="hidden sm:inline">Volver al Dashboard</span>
                    </button>

                    {/* Botón de simulación — solo visible en móvil (lg:hidden) */}
                    <div className="lg:hidden flex-1 flex justify-center">
                        {isCvMode ? (
                            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
                                Creando tu Hoja de Vida
                            </span>
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

                    <div className="ml-auto lg:ml-0">
                        <LogoNext to="/dashboard" />
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

            {/* ── COLUMNA DERECHA (40%): INTERACTIVE HUB ── */}
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

        </div >

        {/* ── MODAL DE GENERACIÓN DE CV ─────────────────────────────────────── */}
        {cvModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in">
                <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl">
                    {cvModal.status === 'generating' ? (
                        <>
                            <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 rounded-full bg-blue-50 flex items-center justify-center">
                                <Loader2 size={28} className="text-[#2563EB] animate-spin" />
                            </div>
                            <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-2">Generando tu CV...</h3>
                            <p className="text-sm text-gray-500">Creando tu archivo Word con diseño Harvard profesional.</p>
                        </>
                    ) : cvModal.status === 'ready' ? (
                        <>
                            <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 rounded-full bg-green-50 flex items-center justify-center">
                                <CheckCircle size={28} className="text-green-500" />
                            </div>
                            <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-2">¡CV generado con éxito!</h3>
                            <p className="text-sm text-gray-500 mb-5">Tu archivo .docx se ha descargado automáticamente.</p>
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
                            <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-2">Error al generar el archivo Word</h3>
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
        </>
    );
};

export default ChatCoach;
