import Button from "../components/Login-Sigin/Button"
import InputField from "../components/Login-Sigin/InputField"
import { Mail, Eye, UserRound } from 'lucide-react'
import SigInImage from '../assets/SigIn/SigInJob.png'

const SigIn = () => {
    return (
        <div className="flex flex-col justify-center items-center h-screen w-full sm:flex-row">
            <h2 className='flex text-[#2563EB] text-3xl font-bold absolute top-8 left-8 sm:hidden'>Next</h2>
            {/* Left */}
            <div className="hidden sm:flex flex-col items-center justify-center relative h-screen grow text-center ">
                <h2 className='text-[#2563EB] text-3xl font-bold absolute top-8 left-8'>Next</h2>
                <h1 className='text-4xl font-bold text-pretty px-4 leadding-2'>
                    Empieza y avanza <br />
                    <span className='font-medium text-xl text-pretty'><span className='text-[#2563EB]'>Empieza</span>  a mostrar tus habilidades y conecta con oportunidades reales de <span className='text-[#4ADE80]'>empleo</span></span>
                </h1>
                <img src={SigInImage} alt="Imagen de trabajo" className='w-full max-w-120 xl:max-w-150'/>
            </div>
            {/* Rigth */}
            <div className="flex justify-center items-center px-10 bg-white sm:w-120 h-screen lg:w-[55%] sm:bg-[radial-gradient(circle,#69809E_0%,#31445E_100%)]">
                <div className="bg-white py-8 px-12 rounded-2xl text-center flex flex-col gap-y-3">
                    <h2 className="text-2xl font-bold">Crear cuenta</h2>
                    <hr className='hidden sm:block text-gray-300' />
                    <form action="">
                        <InputField type="text" placeholder="Nombre Completo" Icono={UserRound} />
                        <InputField type="email" placeholder="Correo electronico" Icono={Mail} />
                        <InputField type="password" placeholder="Contraseña" Icono={Eye} />
                        <InputField type="password" placeholder="Confirmar contraseña" Icono={Eye} />
                        <Button text='Crear Cuenta' />
                    </form>
                    <p className="mt-5 text-[14px] text-[#2563EB]">¿Ya tienes cuenta? <span className="font-bold cursor-pointer">Iniciar sesion</span></p>
                </div>
            </div>
        </div>
    )
}

export default SigIn