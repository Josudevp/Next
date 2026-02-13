import Button from "../components/Button"
import InputField from "../components/InputField"
import { Mail, Eye, UserRound } from 'lucide-react'
import SigInImage from '../assets/SigIn/signUpJob.webp'
import { useState } from "react"
import LogoNext from '../components/LogoNext'

const SigIn = () => {

    // Memoria de datos en input
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    })

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData({
            ...formData,
            [name]: value
        })
        if (errores[name]) {
        setErrores({
            ...errores,
            [name]: null // ...lo borramos de la libreta de errores
        });
    }
    };

    //Envio de datos y manejo de errores
    const [errores, setErrores] = useState({})

    const handleSubmit = (e) => {
        let nuevosErrores = {}
        e.preventDefault()
        if (formData.password != formData.confirmPassword) {
            nuevosErrores.confirmPassword = "Las contraseñas no coinciden";
        }
        if (formData.password.length < 8) {
            nuevosErrores.password = "La contraseña debe contener almenos 8 caracteres"
        }
        if (Object.keys(nuevosErrores).length > 0) {
            setErrores(nuevosErrores);
            return;
        }
        setErrores({}); // Limpiamos errores previos
        console.log("🚀 Datos listos para el Instructor IA:", formData);
    };

    return (
        <div className="flex flex-col justify-center items-center h-screen w-full sm:flex-row relative">
            {/* Logo mobile */}
            <div className='sm:hidden absolute top-6 left-6 z-10'>
                <LogoNext />
            </div>

            {/* Left - Hero Section */}
            <div className="hidden sm:flex flex-1 flex-col h-screen text-center px-8 py-8">
                <div className='mb-auto'>
                    <LogoNext />
                </div>
                <div className='flex flex-col items-center justify-center gap-4 flex-1'>
                    <h1 className='text-3xl lg:text-4xl font-bold text-pretty px-4 leading-snug'>
                        Empieza y avanza <br />
                        <span className='font-medium text-lg lg:text-2xl text-pretty'><span className='text-next-primary'>Empieza</span> a mostrar tus habilidades y conecta con oportunidades reales de <span className='text-[#4ADE80]'>empleo</span></span>
                    </h1>
                    <img src={SigInImage} alt="Persona registrándose para buscar empleo" className='w-full max-w-80 lg:max-w-120 xl:max-w-150' />
                </div>
            </div>

            {/* Right - Form Section */}
            <div className="flex justify-center items-center px-6 sm:px-10 bg-white flex-1 sm:flex-none sm:w-[45%] lg:w-[45%] xl:w-[40%] h-screen sm:bg-[radial-gradient(circle,#69809E_0%,#31445E_100%)] sm:shadow-[-5px_0_10px_3px_rgba(0,0,0,0.3)]">
                <div className="bg-white sm:py-10 sm:px-10 md:px-14 rounded-2xl text-center flex flex-col gap-y-4 w-full max-w-md">
                    <h2 className="text-2xl font-bold">Crear cuenta</h2>
                    <hr className='hidden sm:block text-gray-300' />
                    <form onSubmit={handleSubmit} aria-label="Formulario de registro">
                        <InputField
                            type="text"
                            placeholder="Nombre Completo"
                            Icono={UserRound}
                            name='name'
                            onChange={handleChange}
                            value={formData.name}
                        />
                        <InputField
                            type="email"
                            placeholder="Correo electronico"
                            Icono={Mail}
                            name='email'
                            onChange={handleChange}
                            value={formData.email}
                        />
                        <InputField
                            type="password"
                            placeholder="Contraseña"
                            Icono={Eye}
                            name='password'
                            onChange={handleChange}
                            value={formData.password}
                            error={errores.password}
                        />

                        <InputField
                            type="password"
                            placeholder="Confirmar contraseña"
                            Icono={Eye}
                            name='confirmPassword'
                            onChange={handleChange}
                            value={formData.confirmPassword}
                            error={errores.confirmPassword}
                        />
                        <Button text='Crear Cuenta' />
                    </form>
                    <p className="mt-5 text-[14px] ">¿Ya tienes cuenta? <a href="#" className="font-bold cursor-pointer text-next-primary">Iniciar sesion</a></p>
                </div>
            </div>
        </div>
    )
}

export default SigIn