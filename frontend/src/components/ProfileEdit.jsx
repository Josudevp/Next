import { useState, useEffect } from 'react';
import { Save, AlertCircle, Plus, X, CheckCircle } from 'lucide-react';
import API_URL from '../api/api';

const ProfileEdit = ({ onProfileUpdated }) => {
    const [formData, setFormData] = useState({
        area: '',
        skills: [],
        goals: [],
        jobType: ''
    });

    const [skillInput, setSkillInput] = useState('');
    const [goalInput, setGoalInput] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [alert, setAlert] = useState(null); // { type: 'success' | 'error', message: '' }

    // 1. Cargar datos iniciales
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const token = localStorage.getItem('next_token');
                const response = await fetch(`${API_URL}/user/profile`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!response.ok) throw new Error('Error al cargar perfil');

                const data = await response.json();

                setFormData({
                    area: data.area || '',
                    skills: data.skills || [],
                    goals: data.goals || [],
                    jobType: data.jobType || ''
                });

            } catch (error) {
                console.error(error);
                // Si falla el backend, intentamos con datos locales por ahora
                const localProfile = JSON.parse(localStorage.getItem('next_profile') || '{}');
                setFormData({
                    area: localProfile.area || '',
                    skills: localProfile.skills || [],
                    goals: localProfile.goals || [],
                    jobType: localProfile.jobType || ''
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfile();
    }, []);

    // 2. Manejadores de Inputs básicos
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // 3. Manejadores para Arrays (Skills y Goals)
    const addArrayItem = (field, value, setInputFn) => {
        const trimmed = value.trim();
        if (!trimmed) return;

        if (!formData[field].includes(trimmed)) {
            setFormData(prev => ({
                ...prev,
                [field]: [...prev[field], trimmed]
            }));
        }
        setInputFn('');
    };

    const removeArrayItem = (field, itemToRemove) => {
        setFormData(prev => ({
            ...prev,
            [field]: prev[field].filter(item => item !== itemToRemove)
        }));
    };

    // 4. Guardar datos (PUT)
    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setAlert(null);

        try {
            const token = localStorage.getItem('next_token');
            const response = await fetch(`${API_URL}/user/update`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error('No se pudo guardar la información');
            }

            const result = await response.json();

            // Éxito
            setAlert({ type: 'success', message: '¡Perfil actualizado con éxito!' });

            // Si el padre pasó una función para actualizar de inmediato la vista (ej. Dashboard)
            if (onProfileUpdated) {
                onProfileUpdated(result.user);
            }

        } catch (error) {
            console.error('Error guardando perfil:', error);
            setAlert({ type: 'error', message: 'Hubo un error al guardar los cambios.' });
        } finally {
            setIsSaving(false);

            // Ocultar alerta después de 4 segundos
            setTimeout(() => setAlert(null), 4000);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8 text-gray-400 text-sm">
                Cargando tu información...
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm w-full max-w-2xl mx-auto">
            <div className="mb-6 border-b border-gray-100 pb-4">
                <h2 className="text-xl font-bold text-gray-900">Editar Perfil</h2>
                <p className="text-sm text-gray-400 mt-1">
                    Estos datos se reflejan en tu Score de Empleabilidad.
                </p>
            </div>

            {alert && (
                <div className={`mb-5 p-4 rounded-xl flex items-center gap-3 text-sm animate-fade-in ${alert.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                    {alert.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                    {alert.message}
                </div>
            )}

            <form onSubmit={handleSave} className="space-y-6">

                {/* -- Input Área -- */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-gray-700">Área de especialidad</label>
                    <input
                        type="text"
                        name="area"
                        value={formData.area}
                        onChange={handleChange}
                        placeholder="Ej. Desarrollo Web, Marketing, Diseño UX..."
                        className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    />
                </div>

                {/* -- Habilidades (Chips) -- */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-gray-700">Habilidades ({formData.skills.length}/5 máximas recomendadas)</label>
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={skillInput}
                            onChange={(e) => setSkillInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addArrayItem('skills', skillInput, setSkillInput))}
                            placeholder="Ej. React, Node.js, Liderazgo..."
                            className="flex-1 bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                        />
                        <button
                            type="button"
                            onClick={() => addArrayItem('skills', skillInput, setSkillInput)}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl px-4 py-2.5 text-sm font-medium transition cursor-pointer flex items-center gap-1"
                        >
                            <Plus size={16} /> Añadir
                        </button>
                    </div>

                    {/* Contenedor de Chips de Habilidades */}
                    {formData.skills.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                            {formData.skills.map((skill, index) => (
                                <span key={index} className="inline-flex items-center gap-1 bg-blue-50 border border-blue-100 text-blue-700 px-3 py-1.5 rounded-full text-xs font-medium animate-fade-in-up">
                                    {skill}
                                    <button
                                        type="button"
                                        onClick={() => removeArrayItem('skills', skill)}
                                        className="text-blue-400 hover:text-blue-700 focus:outline-none cursor-pointer p-0.5 rounded-full hover:bg-white/50"
                                    >
                                        <X size={12} />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* -- Metas (Chips) -- */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-gray-700">Metas o Intereses</label>
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={goalInput}
                            onChange={(e) => setGoalInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addArrayItem('goals', goalInput, setGoalInput))}
                            placeholder="Ej. Conseguir primer empleo, Aprender Cloud..."
                            className="flex-1 bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                        />
                        <button
                            type="button"
                            onClick={() => addArrayItem('goals', goalInput, setGoalInput)}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl px-4 py-2.5 text-sm font-medium transition cursor-pointer flex items-center gap-1"
                        >
                            <Plus size={16} /> Añadir
                        </button>
                    </div>

                    {/* Contenedor de Chips de Metas */}
                    {formData.goals.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                            {formData.goals.map((goal, index) => (
                                <span key={index} className="inline-flex items-center gap-1 bg-purple-50 border border-purple-100 text-purple-700 px-3 py-1.5 rounded-full text-xs font-medium animate-fade-in-up">
                                    {goal}
                                    <button
                                        type="button"
                                        onClick={() => removeArrayItem('goals', goal)}
                                        className="text-purple-400 hover:text-purple-700 focus:outline-none cursor-pointer p-0.5 rounded-full hover:bg-white/50"
                                    >
                                        <X size={12} />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                <div className="pt-3">
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="w-full flex items-center justify-center gap-2 bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded-xl py-3 text-sm font-semibold transition-all shadow-sm active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                    >
                        {isSaving ? (
                            <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                        ) : (
                            <Save size={16} />
                        )}
                        Guardar Cambios
                    </button>
                </div>

            </form>
        </div>
    );
};

export default ProfileEdit;
