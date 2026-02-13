import { useState } from 'react'
import Button from '../components/Button'
import InputField from '../components/InputField'
import { Mail, Lock } from 'lucide-react'
import LoginJobImg from '../assets/login/Login.webp'
import LogoNext from '../components/LogoNext'

const Login = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    })

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData({
            ...formData,
            [name]: value
        })
    }
    return (
        <div className='flex flex-col-reverse sm:flex-row h-screen w-full relative'>
            {/* Logo mobile */}
            <div className='sm:hidden absolute top-6 left-6 z-10'>
                <LogoNext />
            </div>

            {/* Sección del formulario */}
            <div className='bg-white flex-1 sm:flex-none sm:w-[45%] lg:w-[45%] xl:w-[40%] h-screen flex items-center justify-center sm:bg-[#31445E] sm:bg-[radial-gradient(circle,#69809E_0%,#31445E_100%)] sm:shadow-[5px_0_10px_3px_rgba(0,0,0,0.3)] py-8 px-5'>
                <div className='bg-white py-10 px-8 sm:px-10 md:px-14 rounded-2xl text-center flex flex-col gap-y-6 w-full max-w-md'>
                    <h2 className='text-2xl font-bold'>Bienvenido</h2>
                    <hr className='text-gray-300' />
                    <form action="" aria-label="Formulario de inicio de sesión">
                        <div className='flex flex-col gap-1'>
                            <InputField
                                type="email"
                                placeholder="Correo Electronico"
                                Icono={Mail}
                                name="email"              
                                value={formData.email}
                                onChange={handleChange}
                            />
                            <InputField
                                type="password"
                                placeholder="Contraseña"
                                Icono={Lock}
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                            />
                        </div>
                        <div className='flex items-center gap-2 mb-5'>
                            <input type="checkbox" id="remember" className='cursor-pointer' />
                            <label htmlFor="remember" className='opacity-80 text-sm cursor-pointer'>Recordarme</label>
                        </div>
                        <Button text='Iniciar sesion' />
                    </form>
                    <p className='text-xs sm:text-sm'>¿Olvidaste tu contraseña?</p>
                    <p className='text-xs sm:text-sm'>¿No tienes cuenta? <span className='font-bold text-next-primary cursor-pointer'>Crear una</span></p>
                </div>
            </div>

            {/* Sección de imagen/hero - oculta en mobile */}
            <div className='hidden sm:flex flex-1 flex-col h-screen text-center px-8 py-8'>
                <div className='mb-auto'>
                    <LogoNext />
                </div>
                <div className='flex flex-col items-center justify-center gap-4 flex-1'>
                    <h1 className='text-3xl lg:text-4xl font-bold text-pretty px-4'>
                        Conecta tu talento <br />
                        <span className='font-medium'>con tu <span className='text-next-primary'>proximo</span> <span className='text-[#4ADE80]'>empleo</span></span>
                    </h1>
                    <img src={LoginJobImg} alt="Persona buscando empleo" className='w-full max-w-80 lg:max-w-120 xl:max-w-150' />
                </div>
            </div>
        </div>
    )
}

export default Login