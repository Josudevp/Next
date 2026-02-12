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
        <div className='flex flex-col-reverse sm:flex-row h-screen w-full'>
            {/* Sección del formulario */}
            <h2 className='flex sm:hidden text-next-primary text-3xl font-bold absolute top-8 left-8'>Next</h2>
            <div className='bg-white sm:w-120 h-screen lg:w-[55%] flex items-center justify-center sm:bg-[#31445E] sm:bg-[radial-gradient(circle,#69809E_0%,#31445E_100%)] shadow-[5px_0_10px_3px_rgba(0,0,0,0.3)] py-8 px-5'>
                <div className='bg-white py-8 px-12 rounded-2xl text-center flex flex-col gap-y-6'>
                    <h2 className='text-2xl font-bold'>Bienvenido</h2>
                    <hr className='text-gray-300' />
                    <form action="">
                        <div>
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
                                name= "password"
                                value={formData.password}
                                onChange={handleChange}
                            />

                        </div>
                        <div className='flex gap-2'>
                            <input type="checkbox" />
                            <p className='opacity-80 text-sm'>Recordarme</p>
                        </div>
                        <Button text='Iniciar sesion' />
                    </form>
                    <p className='text-xs sm:text-sm'>¿Olvidaste tu contraseña?</p>
                    <p className='text-xs sm:text-sm'>¿No tienes cuenta? <span className='font-bold text-next-primary cursor-pointer'>Crear una</span></p>
                </div>
            </div>

            {/* Sección de imagen/hero - oculta en mobile */}
            <div className='hidden sm:flex flex-col items-center justify-center relative h-screen grow text-center'>
                <LogoNext />
                <h1 className='text-4xl font-bold text-pretty px-4'>
                    Conecta tu talento <br />
                    <span className='font-medium'>con tu <span className='text-next-primary'>proximo</span> <span className='text-[#4ADE80]'>empleo</span></span>
                </h1>
                <img src={LoginJobImg} alt="Imagen de trabajo" className='w-full max-w-120 xl:max-w-150' />
            </div>
        </div>
    )
}

export default Login