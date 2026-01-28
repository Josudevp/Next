import Button from '../components/login/Button'
import InputField from '../components/login/InputField'
import { Mail, Lock } from 'lucide-react'
import LoginJobImg from '../assets/login/LoginJob.png'

const Login = () => (
    <div className='flex h-screen w-full'>
        <div className='min-w-[55%] flex items-center justify-center bg-[#31445E] bg-[radial-gradient(circle,#69809E_0%,#31445E_100%)] z-99 shadow-[5px_0_10px_3px_rgba(0,0,0,0.3)]'>
            <div className='bg-white py-10 w-[45%] px-10 rounded-2xl text-center flex flex-col gap-y-4'>
                <h2 className='pb-4 text-2xl font-bold'>Bienvenido</h2>
                <hr className='text-gray-300' />
                <form action="">
                    <div>
                        <InputField type="email" placeholder="Correo Electronico" Icono={Mail} />
                        <InputField type="password" placeholder="Contraseña" Icono={Lock} />
                    </div>
                    <div className='flex gap-2  '>
                        <input type="checkbox" />
                        <p className='opacity-80'>Recordarme</p>
                    </div>
                    <Button text='Iniciar sesion'/>
                </form>
                <p className='text-2xs'>¿Olvidaste tu contraseña?</p>
                <p className='text-2xs'>¿No tienes cuenta? <span className='font-bold text-[#2563EB]'>Crear una</span></p>
            </div>
        </div>
        <div className='flex flex-col items-center justify-center relative h-screen grow text-center'>
            <h2 className='text-[#2563EB] text-3xl font-bold absolute top-8 left-8'>Next</h2>
            <h1 className='text-5xl font-bold text-pretty'>Conecta tu talento <br /><span className='font-medium'>con tu <span className='text-[#2563EB]'>proximo</span> <span className='text-[#4ADE80]'>empleo</span></span></h1>
            <img src={LoginJobImg} alt="Imagen de trabajo" className='w-120'/>
        </div>
    </div>
)

export default Login