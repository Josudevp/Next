import { useState, useRef, useEffect } from 'react';
import { Bot, Send, User, Loader2, ChevronLeft, Mic, MicOff, PlayCircle, SquareSquare, Activity } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';
import LogoNext from '../components/LogoNext';
import Robot3D from '../components/Robot3D';
import axiosInstance from '../api/axiosInstance';

const ChatCoach = () => {
    const navigate = useNavigate();

    // 1. Estados
    const [isInterviewMode, setIsInterviewMode] = useState(false);

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

    // 3. Saludo personalizado — GET /api/coach/init
    useEffect(() => {
        const fetchInitGreeting = async () => {
            try {
                setIsTyping(true);
                // axiosInstance inyecta el Authorization: Bearer <token> automáticamente
                const { data } = await axiosInstance.get('/coach/init');
                const greetingText = data.reply || '¡Hola! Soy tu IA Coach de NEXT. ¿En qué te puedo ayudar?';

                setMessages([{
                    id: 'init',
                    text: greetingText,
                    sender: 'ai'
                }]);
            } catch (error) {
                console.error('[ChatCoach] Error al obtener saludo inicial:', error);
                // Fallback genérico si el endpoint falla
                setMessages([{
                    id: 'init',
                    text: '¡Hola! Soy tu IA Coach de NEXT. Estoy listo para ayudarte con tu preparación profesional. ¿Empezamos?',
                    sender: 'ai'
                }]);
            } finally {
                setIsTyping(false);
            }
        };

        fetchInitGreeting();
        // Solo al montar — no incluir dependencias para que no se repita
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

    // 5. Función de Text-to-Speech (Coach Voz) — con selección de voz femenina en español
    const speakText = (text) => {
        if (!('speechSynthesis' in window)) return;

        window.speechSynthesis.cancel();
        const cleanText = cleanTextForSpeech(text);

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'es-ES';
        utterance.rate = 1.05;
        utterance.pitch = 1.1; // Tono ligeramente más agudo → percepción femenina

        // Nombres comunes para voces femeninas en español (Chrome, Linux, Safari, Windows)
        // Agregamos variantes comunes en Linux como 'Elena', 'Hispavox', 'Mexico'
        const FEMALE_VOICE_NAMES = [
            'Paulina', 'Mónica', 'Monica', 'Sabina', 'Helena', 'Elena', 'Laura',
            'Lucia', 'Lucía', 'Esperanza', 'Zira', 'Hispavox Elena', 'Google español',
            'Spanish Female', 'es-es', 'es-mx', 'f1', 'f2', 'Espanol', 'Mexico', 'Spain'
        ];

        const assignVoice = () => {
            const voices = window.speechSynthesis.getVoices();
            if (voices.length === 0) return false;

            // 1. Priorizar por nombres conocidos de mujer + idioma español
            let selected = voices.find(v =>
                v.lang.startsWith('es') &&
                FEMALE_VOICE_NAMES.some(name => v.name.toLowerCase().includes(name.toLowerCase()))
            );

            // 2. Fallback: cualquier voz que contenga 'female' o 'mujer' o 'f' en el nombre descriptivo
            if (!selected) {
                selected = voices.find(v =>
                    v.lang.startsWith('es') &&
                    (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('f') || v.name.toLowerCase().includes('mujer'))
                ) || voices.find(v => v.lang.startsWith('es'));
            }

            if (selected) {
                utterance.voice = selected;
                // Si la voz parece ser masculina por nombre, elevamos el pitch para intentar feminizarla
                const nameLow = selected.name.toLowerCase();
                const isLikelyMale = nameLow.includes('male') || nameLow.includes('david') || nameLow.includes('pablo') || nameLow.includes('jose');
                utterance.pitch = isLikelyMale ? 1.4 : 1.15;
                console.debug('[TTS] Voz configurada:', selected.name);
            } else {
                utterance.pitch = 1.35; // Fallback extremo para dar tono femenino
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
                isInterviewMode
            };

            // El interceptor adjunta el token y gestiona el error 401 automáticamente
            const { data } = await axiosInstance.post('/coach/chat', requestBody);
            const aiReplyText = data.reply || 'No pude procesar tu solicitud, intenta de nuevo';

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
        <div className="flex w-full h-[100dvh] bg-white font-sans overflow-hidden fixed inset-0">

            {/* ── COLUMNA IZQUIERDA (60%): CHAT & INPUT ── */}
            <div className="w-full lg:w-[60%] flex flex-col h-full border-r border-gray-100 shadow-[2px_0_15px_rgba(0,0,0,0.02)] relative z-10 bg-white">

                {/* Header (Nav interno) */}
                <div className="h-16 flex items-center px-6 border-b border-gray-100 flex-shrink-0">
                    <button
                        onClick={() => {
                            if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                            navigate('/dashboard');
                        }}
                        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#2563EB] transition-colors cursor-pointer"
                    >
                        <ChevronLeft size={16} /> Volver al Dashboard
                    </button>
                    <div className="ml-auto">
                        <LogoNext />
                    </div>
                </div>

                {/* CONTENIDO VARIABLE SEGÚN MODO: Chat vs UI de Llamada */}
                {!isInterviewMode ? (
                    <>
                        {/* Área de mensajes con scroll encapsulado */}
                        <div className="flex-1 overflow-y-auto px-6 py-6 bg-slate-50 flex flex-col gap-5">
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
                        <div className="p-4 sm:p-6 bg-white border-t border-gray-100 flex-shrink-0">
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
                    <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 px-6 py-8 relative">
                        <div className="absolute top-1/4 flex flex-col items-center text-center">
                            <div className={`w-24 h-24 mb-6 rounded-full flex items-center justify-center bg-white shadow-xl ${isListening ? 'shadow-red-500/30' : 'shadow-blue-500/20'}`}>
                                {isTyping ? <Activity size={40} className="text-[#2563EB] animate-pulse" /> : isListening ? <Mic size={40} className="text-red-500 animate-pulse" /> : <Bot size={40} className="text-gray-800" />}
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">Entrevista en curso</h2>
                            <p className="text-gray-500 max-w-sm">
                                {isListening ? 'Te estoy escuchando. Responde en voz alta y seré todo oídos.' : isTyping ? 'El Reclutador está procesando tu respuesta...' : 'Presiona el micrófono inferior para hablar.'}
                            </p>

                            {/* Simulador de Frecuencia Audio */}
                            <div className="flex items-center justify-center gap-1 mt-8 h-12">
                                {[...Array(8)].map((_, i) => (
                                    <div
                                        key={i}
                                        className={`w-1.5 rounded-full ${isTyping ? 'bg-blue-500' : isListening ? 'bg-red-500' : 'bg-gray-300'} transition-all duration-300`}
                                        style={{ height: (isListening || isTyping) ? `${Math.max(10, Math.random() * 40 + 10)}px` : '4px', animation: (isListening || isTyping) ? `pulse 1s infinite ${i * 0.1}s` : 'none' }}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="mt-auto pt-10 w-full max-w-sm mx-auto flex flex-col gap-4">
                            <button
                                onClick={toggleListening}
                                className={`w-full py-4 rounded-2xl font-bold flex flex-col items-center justify-center gap-1 transition-all shadow-lg active:scale-95 cursor-pointer ${isListening ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-[#2563EB] text-white hover:bg-blue-700'}`}
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
                    </div>
                </div>

            </div>

        </div >
    );
};

export default ChatCoach;
