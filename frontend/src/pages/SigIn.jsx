import Button from "../components/Login-Sigin/Button"
import InputField from "../components/Login-Sigin/InputField"
import {Mail, Eye, UserRound} from 'lucide-react'

const SigIn = () => {
    return (
        <div className="flex flex-col justify-center items-center h-screen w-full">
            <h2 className='flex text-[#2563EB] text-3xl font-bold absolute top-8 left-8'>Next</h2>
            {/* Left */}
            <div className="hidden">
                
            </div>
            {/* Rigth */}
            <div className="flex flex-col justify-center items-center">
                <h2 className="text-2xl font-bold">Crear cuenta</h2>
                <form action="">
                    <InputField type="text" placeholder="Nombre Completo" Icono={UserRound}/>
                    <InputField type="email" placeholder="Correo electronico" Icono={Mail}/>
                    <InputField type="password" placeholder="Contraseña" Icono={Eye}/>
                    <InputField type="password" placeholder="Confirmar contraseña" Icono={Eye}/>
                    <Button text='Crear Cuenta'/>
                </form>
                <p className="mt-5 text-[14px] text-[#2563EB]">¿Ya tienes cuenta? <span className="font-bold cursor-pointer">Iniciar sesion</span></p>
                
            </div>
        </div>
    )
}

export default SigIn