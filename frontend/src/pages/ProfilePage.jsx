import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    ArrowLeft, Save, Camera, Upload, X, Plus,
    FileText, CheckCircle, AlertCircle, Loader2, Trash2, Wand2,
    Bell, BellOff
} from 'lucide-react'
import LogoNext from '../components/LogoNext'
import axiosInstance from '../api/axiosInstance'
import Seo from '../components/Seo'
import { mergeStoredUser } from '../utils/sessionUser'

// ── Opciones fijas ────────────────────────────────────────────────────────────
const EXPERIENCE_OPTIONS = [
    'Sin experiencia',
    'Menos de 1 año',
    '1-3 años',
    '3-5 años',
    'Más de 5 años',
]

const syncSessionUser = (profile) => {
    if (!profile) return

    mergeStoredUser({
        name: profile.name,
        email: profile.email,
        profilePicture: profile.profilePicture,
    })
}

// ── Sub-componente: Avatar con selector de foto ───────────────────────────────
const AvatarUpload = ({ previewUrl, name, onChange }) => {
    const inputRef = useRef(null)

    const initials = (name || '?')
        .split(' ')
        .filter(Boolean)
        .map(n => n[0].toUpperCase())
        .slice(0, 2)
        .join('')

    return (
        <div className="relative group">
            <div
                onClick={() => inputRef.current.click()}
                className="w-24 h-24 rounded-full cursor-pointer overflow-hidden ring-4 ring-white shadow-lg shrink-0"
            >
                {previewUrl ? (
                    <img
                        src={previewUrl}
                        alt="Foto de perfil"
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full bg-linear-to-br from-[#1B49AE] to-next-secondary flex items-center justify-center text-white text-2xl font-bold">
                        {initials}
                    </div>
                )}
                {/* Overlay hover */}
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera size={20} className="text-white" />
                </div>
            </div>
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onChange}
            />
        </div>
    )
}

// ── Sub-componente: Zona Drag & Drop para CV ──────────────────────────────────
const CvDropZone = ({ cvFile, hasCv, onFileChange, onClear }) => {
    const [isDragging, setIsDragging] = useState(false)
    const inputRef = useRef(null)

    const handleDrop = (e) => {
        e.preventDefault()
        setIsDragging(false)
        const file = e.dataTransfer.files[0]
        if (file && file.type === 'application/pdf') onFileChange(file)
    }

    return (
        <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`relative rounded-2xl border-2 border-dashed transition-all duration-200 p-6 text-center
                ${isDragging
                    ? 'border-next-primary bg-blue-50/60'
                    : cvFile || hasCv
                        ? 'border-green-300 bg-green-50/40'
                        : 'border-gray-200 bg-slate-50/60 hover:border-next-primary/50 hover:bg-blue-50/20'
                }`}
        >
            {cvFile ? (
                /* Archivo nuevo seleccionado */
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                            <FileText size={18} className="text-green-600" />
                        </div>
                        <div className="text-left min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{cvFile.name}</p>
                            <p className="text-xs text-gray-400">{(cvFile.size / 1024).toFixed(0)} KB · PDF</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClear}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1 shrink-0 cursor-pointer"
                        aria-label="Quitar archivo"
                    >
                        <X size={16} />
                    </button>
                </div>
            ) : hasCv ? (
                /* Ya tiene CV guardado */
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                            <CheckCircle size={18} className="text-green-600" />
                        </div>
                        <div className="text-left">
                            <p className="text-sm font-semibold text-gray-800">CV procesado por la IA ✓</p>
                            <p className="text-xs text-gray-400">Sube uno nuevo para reemplazarlo</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => inputRef.current.click()}
                        className="text-xs text-next-primary font-semibold hover:underline cursor-pointer shrink-0"
                    >
                        Reemplazar
                    </button>
                </div>
            ) : (
                /* Estado vacío */
                <div
                    onClick={() => inputRef.current.click()}
                    className="cursor-pointer flex flex-col items-center gap-3"
                >
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                        <Upload size={20} className="text-next-primary" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-700">
                            Sube tu CV y deja que la IA haga el resto
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                            Arrastra un PDF aquí o haz clic para seleccionar · Máx. 5 MB
                        </p>
                    </div>
                </div>
            )}
            <input
                ref={inputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files[0]
                    if (file) onFileChange(file)
                    e.target.value = ''
                }}
            />
        </div>
    )
}

// ── Página principal ──────────────────────────────────────────────────────────
const ProfilePage = () => {
    const navigate = useNavigate()

    const [formData, setFormData] = useState({
        name: '',
        area: '',
        skills: [],
        goals: [],
        jobType: '',
        experienceLevel: 'Sin experiencia',
    })
    const [profilePicture, setProfilePicture] = useState(null)   // base64 guardada
    const [avatarPreview, setAvatarPreview]   = useState(null)   // preview local
    const [avatarFile, setAvatarFile]         = useState(null)   // File a subir
    const [cvFile, setCvFile]                 = useState(null)   // File PDF a subir
    const [hasCv, setHasCv]                   = useState(false)
    const [skillInput, setSkillInput]         = useState('')
    const [goalInput, setGoalInput]           = useState('')
    const [isLoading, setIsLoading]           = useState(true)
    const [isSaving, setIsSaving]             = useState(false)
    const [isDeletingPhoto, setIsDeletingPhoto] = useState(false)
    const [isDeletingCv, setIsDeletingCv]       = useState(false)
    const [hunterEnabled, setHunterEnabled]     = useState(true)
    const [alert, setAlert]                   = useState(null)   // { type, message }

    // ── Cargar perfil desde el backend ────────────────────────────────────────
    useEffect(() => {
        const load = async () => {
            try {
                const { data } = await axiosInstance.get('/user/profile')
                setFormData({
                    name:            data.name            || '',
                    area:            data.area            || '',
                    skills:          data.skills          || [],
                    goals:           data.goals           || [],
                    jobType:         data.jobType         || '',
                    experienceLevel: data.experienceLevel || 'Sin experiencia',
                })
                if (data.profilePicture) {
                    setProfilePicture(data.profilePicture)
                    setAvatarPreview(data.profilePicture)
                }
                setHasCv(data.hasCv || false)
                setHunterEnabled(data.hunterNotificationsEnabled !== false)
                syncSessionUser(data)
            } catch (err) {
                console.error('[ProfilePage] Error cargando perfil:', err.message)
                showAlert('error', 'No se pudo cargar el perfil. Intenta de nuevo.')
            } finally {
                setIsLoading(false)
            }
        }
        load()
    }, [])

    const showAlert = (type, message) => {
        setAlert({ type, message })
        setTimeout(() => setAlert(null), 4500)
    }

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    // ── Chips arrays ──────────────────────────────────────────────────────────
    const addChip = (field, value, setInput) => {
        const v = value.trim()
        if (!v || formData[field].includes(v)) return
        setFormData(prev => ({ ...prev, [field]: [...prev[field], v] }))
        setInput('')
    }

    const removeChip = (field, item) => {
        setFormData(prev => ({ ...prev, [field]: prev[field].filter(i => i !== item) }))
    }

    // ── Avatar ────────────────────────────────────────────────────────────────
    const handleAvatarChange = (e) => {
        const file = e.target.files[0]
        if (!file) return
        setAvatarFile(file)
        setAvatarPreview(URL.createObjectURL(file))
    }

    const handleRemoveAvatar = async () => {
        if (avatarFile) {
            setAvatarFile(null)
            setAvatarPreview(profilePicture)
            return
        }

        if (!profilePicture) return

        const confirmed = window.confirm('¿Eliminar tu foto de perfil actual?')
        if (!confirmed) return

        setIsDeletingPhoto(true)
        try {
            const { data } = await axiosInstance.delete('/user/profile/picture')
            setProfilePicture(null)
            setAvatarPreview(null)
            setAvatarFile(null)
            syncSessionUser(data.user)
            showAlert('success', data.mensaje || 'Foto de perfil eliminada.')
        } catch (err) {
            const msg = err.response?.data?.mensaje || 'No se pudo eliminar la foto de perfil.'
            showAlert('error', msg)
        } finally {
            setIsDeletingPhoto(false)
        }
    }

    const handleRemoveCv = async () => {
        if (cvFile) {
            setCvFile(null)
            return
        }

        if (!hasCv) return

        const confirmed = window.confirm('¿Eliminar el CV guardado en tu perfil?')
        if (!confirmed) return

        setIsDeletingCv(true)
        try {
            const { data } = await axiosInstance.delete('/user/profile/cv')
            setCvFile(null)
            setHasCv(false)
            syncSessionUser(data.user)
            showAlert('success', data.mensaje || 'CV eliminado.')
        } catch (err) {
            const msg = err.response?.data?.mensaje || 'No se pudo eliminar el CV.'
            showAlert('error', msg)
        } finally {
            setIsDeletingCv(false)
        }
    }

    // ── Submit ────────────────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsSaving(true)
        setAlert(null)

        try {
            const fd = new FormData()

            // Campos de texto
            fd.append('name',            formData.name)
            fd.append('area',            formData.area)
            fd.append('jobType',         formData.jobType)
            fd.append('experienceLevel', formData.experienceLevel)
            fd.append('skills',          JSON.stringify(formData.skills))
            fd.append('goals',           JSON.stringify(formData.goals))

            // Archivos (solo si el usuario eligió uno nuevo)
            if (avatarFile) fd.append('avatar', avatarFile)
            if (cvFile)     fd.append('cv',     cvFile)

            fd.append('hunterNotificationsEnabled', String(hunterEnabled))

            const { data } = await axiosInstance.put('/user/profile', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 60000, // El PDF puede tardar en procesarse
            })

            if (data.user?.profilePicture) {
                setProfilePicture(data.user.profilePicture)
                setAvatarPreview(data.user.profilePicture)
            } else {
                setProfilePicture(null)
                setAvatarPreview(null)
            }
            setHasCv(Boolean(data.user?.hasCv))
            syncSessionUser(data.user)

            setAvatarFile(null)
            setCvFile(null)
            showAlert('success', '¡Perfil actualizado con éxito!')

        } catch (err) {
            const msg = err.response?.data?.mensaje || 'Hubo un error al guardar los cambios.'
            showAlert('error', msg)
            console.error('[ProfilePage] Error guardando:', err.message)
        } finally {
            setIsSaving(false)
        }
    }

    // ── Loading skeleton ──────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="min-h-screen bg-next-gray flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 rounded-full border-2 border-next-primary border-t-transparent animate-spin" />
                    <span className="text-sm text-gray-400">Cargando perfil...</span>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-next-gray">
            <Seo
                title={`Mi Perfil | ${formData.name || 'Usuario'} | Next Job Hunter`}
                description="Gestiona tu perfil, foto y CV en Next Job Hunter."
                path="/profile"
                robots="noindex, nofollow"
            />

            {/* ── Top Bar ────────────────────────────────────────────────── */}
            <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 sm:px-8 py-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
                    >
                        <ArrowLeft size={16} />
                        Dashboard
                    </button>
                    <div className="hidden sm:block">
                        <LogoNext to="/dashboard" />
                    </div>
                </div>
                <span className="text-sm font-semibold text-gray-700">Mi Perfil</span>
            </header>

            {/* ── Contenido ──────────────────────────────────────────────── */}
            <main className="max-w-2xl mx-auto px-4 py-8 pb-20">

                {/* Alert */}
                {alert && (
                    <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 text-sm animate-fade-in
                        ${alert.type === 'success'
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : 'bg-red-50 text-red-700 border border-red-200'}`}
                    >
                        {alert.type === 'success'
                            ? <CheckCircle size={18} />
                            : <AlertCircle size={18} />}
                        {alert.message}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* ── Sección 1: Cabecera Visual ───────────────────── */}
                    <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                        <h2 className="text-base font-bold text-gray-800 mb-5">Información personal</h2>

                        <div className="flex flex-col sm:flex-row items-center gap-5">
                            <div className="flex flex-col items-center gap-3">
                                <AvatarUpload
                                    previewUrl={avatarPreview}
                                    name={formData.name}
                                    onChange={handleAvatarChange}
                                />
                                <button
                                    type="button"
                                    onClick={handleRemoveAvatar}
                                    disabled={isDeletingPhoto || (!avatarFile && !profilePicture)}
                                    className="text-xs font-semibold text-red-500 hover:text-red-600 disabled:text-gray-300 disabled:cursor-not-allowed cursor-pointer transition-colors"
                                >
                                    {isDeletingPhoto ? 'Eliminando foto...' : 'Eliminar foto'}
                                </button>
                            </div>
                            <div className="flex-1 flex flex-col gap-3">
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nombre</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="Tu nombre completo"
                                        className="bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Área de especialidad</label>
                                    <input
                                        type="text"
                                        name="area"
                                        value={formData.area}
                                        onChange={handleChange}
                                        placeholder="Ej. Desarrollo Web, Marketing..."
                                        className="bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* ── Sección 2: Magic Upload ──────────────────────── */}
                    <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                        <div className="flex items-start justify-between mb-2">
                            <div>
                                <h2 className="text-base font-bold text-gray-800">Hoja de vida</h2>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    La IA leerá tu CV para personalizar consejos y entrevistas
                                </p>
                            </div>
                            {hasCv && !cvFile && (
                                <span className="text-xs bg-green-50 text-green-600 border border-green-200 rounded-full px-2.5 py-1 font-semibold">
                                    IA conectada
                                </span>
                            )}
                        </div>

                        <CvDropZone
                            cvFile={cvFile}
                            hasCv={hasCv}
                            onFileChange={setCvFile}
                            onClear={() => setCvFile(null)}
                        />

                        {/* Crear CV con IA — CTA secundario */}
                        <div className="mt-3 pt-3 border-t border-gray-100">
                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    type="button"
                                    onClick={() => navigate('/coach?mode=createcv')}
                                    className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold text-[#1B49AE] border border-[#1B49AE]/25 bg-blue-50/60 hover:bg-blue-100/60 rounded-xl px-4 py-2.5 transition-all cursor-pointer"
                                >
                                    <Wand2 size={15} />
                                    Crear CV con IA
                                </button>
                                <button
                                    type="button"
                                    onClick={handleRemoveCv}
                                    disabled={isDeletingCv || (!cvFile && !hasCv)}
                                    className="flex items-center justify-center gap-2 text-sm font-semibold text-red-500 border border-red-200 bg-red-50 hover:bg-red-100 rounded-xl px-4 py-2.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Trash2 size={15} />
                                    {isDeletingCv ? 'Eliminando CV...' : 'Eliminar CV'}
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* ── Sección 3: Datos del perfil ──────────────────── */}
                    <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-5">
                        <h2 className="text-base font-bold text-gray-800">Perfil profesional</h2>

                        {/* Nivel de experiencia */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-gray-700">Nivel de experiencia</label>
                            <select
                                name="experienceLevel"
                                value={formData.experienceLevel}
                                onChange={handleChange}
                                className="bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all cursor-pointer"
                            >
                                {EXPERIENCE_OPTIONS.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </div>

                        {/* Habilidades */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-gray-700">
                                Habilidades
                                <span className="text-gray-400 font-normal ml-1">({formData.skills.length}/5 recomendadas)</span>
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={skillInput}
                                    onChange={e => setSkillInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addChip('skills', skillInput, setSkillInput))}
                                    placeholder="Ej. React, Liderazgo, SQL..."
                                    className="flex-1 bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => addChip('skills', skillInput, setSkillInput)}
                                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl px-4 py-2.5 text-sm font-medium transition cursor-pointer flex items-center gap-1"
                                >
                                    <Plus size={15} />
                                </button>
                            </div>
                            {formData.skills.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {formData.skills.map((skill, i) => (
                                        <span key={i} className="inline-flex items-center gap-1 bg-blue-50 border border-blue-100 text-blue-700 px-3 py-1.5 rounded-full text-xs font-medium">
                                            {skill}
                                            <button
                                                type="button"
                                                onClick={() => removeChip('skills', skill)}
                                                className="text-blue-400 hover:text-blue-700 cursor-pointer p-0.5 rounded-full hover:bg-white/50"
                                            >
                                                <X size={11} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Metas */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-gray-700">Metas e intereses</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={goalInput}
                                    onChange={e => setGoalInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addChip('goals', goalInput, setGoalInput))}
                                    placeholder="Ej. Conseguir primer empleo, Aprender Cloud..."
                                    className="flex-1 bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => addChip('goals', goalInput, setGoalInput)}
                                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl px-4 py-2.5 text-sm font-medium transition cursor-pointer flex items-center gap-1"
                                >
                                    <Plus size={15} />
                                </button>
                            </div>
                            {formData.goals.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {formData.goals.map((goal, i) => (
                                        <span key={i} className="inline-flex items-center gap-1 bg-purple-50 border border-purple-100 text-purple-700 px-3 py-1.5 rounded-full text-xs font-medium">
                                            {goal}
                                            <button
                                                type="button"
                                                onClick={() => removeChip('goals', goal)}
                                                className="text-purple-400 hover:text-purple-700 cursor-pointer p-0.5 rounded-full hover:bg-white/50"
                                            >
                                                <X size={11} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>

                    {/* ── Sección 4: Notificaciones ────────────────── */}
                    <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${hunterEnabled ? 'bg-blue-50' : 'bg-gray-100'}`}>
                                    {hunterEnabled
                                        ? <Bell size={18} className="text-next-primary" />
                                        : <BellOff size={18} className="text-gray-400" />
                                    }
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-gray-800">Correo diario de vacantes</p>
                                    <p className="text-xs text-gray-400 mt-0.5 leading-snug">
                                        Recibe cada mañana un resumen de ofertas nuevas según tu perfil
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={hunterEnabled}
                                onClick={() => setHunterEnabled(prev => !prev)}
                                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200
                                    ${hunterEnabled ? 'bg-next-primary' : 'bg-gray-300'}`}
                            >
                                <span
                                    className={`inline-block h-5 w-5 self-center rounded-full bg-white shadow-sm transition-transform duration-200
                                        ${hunterEnabled ? 'translate-x-5.5' : 'translate-x-0.5'}`}
                                />
                            </button>
                        </div>
                    </section>

                    {/* ── Botón guardar ────────────────────────────────── */}
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="w-full flex items-center justify-center gap-2 bg-next-primary hover:bg-blue-700 text-white rounded-2xl py-3.5 text-sm font-semibold transition-all shadow-md active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                {cvFile ? 'Procesando CV...' : 'Guardando...'}
                            </>
                        ) : (
                            <>
                                <Save size={16} />
                                Guardar cambios
                            </>
                        )}
                    </button>

                </form>
            </main>
        </div>
    )
}

export default ProfilePage
