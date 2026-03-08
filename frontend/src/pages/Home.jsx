import { useNavigate } from 'react-router-dom'
import Robot3D from '../components/Robot3D'
import SecundaryBtn from '../components/SecundaryBtn'
import Button from '../components/Button'
import LogoNext from '../components/LogoNext'

const Home = () => {

    const navigate = useNavigate()

    const irAlSigin = () => {
        navigate('/signin')
    }

    const irAlLogin = () => {
        navigate('/login')
    }

    return (
        <main className='relative min-h-dvh overflow-hidden bg-linear-to-b from-[#EFEFEF] via-[#DCE5F3] to-[#8DA8D8] px-5 py-4 sm:px-6 md:h-dvh md:px-10 md:py-6 lg:px-16'>
            {/* Logo - Always Top Left */}
            <nav className='relative z-10 mb-4 md:mb-0 md:absolute md:top-6 md:left-16'>
                <LogoNext />
            </nav>

            <div className='pointer-events-none absolute inset-x-0 bottom-0 h-[42vh] bg-linear-to-t from-[#5F7FB5]/80 via-[#AFC1E7]/35 to-transparent' />

            {/* Hero Section */}
            <div className='relative z-10 mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-7xl flex-1 flex-col justify-between gap-7 pt-2 pb-6 md:h-full md:min-h-0 md:flex-row md:items-center md:justify-center md:gap-12 md:pt-6 md:pb-6 lg:gap-16'>
                
                {/* Content Section */}
                <section className='flex w-full flex-col gap-5 pt-6 md:w-1/2 md:gap-7 md:pt-0'>
                    {/* Main Heading and Description */}
                    <div className='flex flex-col gap-4 md:gap-5'>
                        <h1 className='max-w-none text-[3.2rem] font-bold text-center leading-[0.96] text-pretty text-black sm:text-5xl md:max-w-none md:text-left lg:text-[4rem] xl:text-[4.5rem]'>
                            Busca <span className='text-[#3B82F6]'>empleo</span> con la confianza de un <span className='text-[#3B82F6]'>experto</span>
                        </h1>
                        
                        <p className='mx-auto max-w-88 text-base text-center text-slate-800 text-pretty leading-relaxed sm:max-w-xl sm:text-lg md:mx-0 md:text-left lg:text-[1.35rem]'>
                            Next es el instructor IA que transforma tu perfil académico en una marca profesional imparable, guiándote hacia las vacantes donde tu talento brilla.
                        </p>
                    </div>
                </section>
                
                {/* Interactive Section */}
                <section className='flex w-full flex-col items-center justify-end gap-5 pb-4 md:w-1/2 md:justify-center md:gap-7 md:pb-0'>
                    {/* 3D Robot - Hidden on mobile */}
                    <div className='hidden w-full justify-center md:flex'>
                        <Robot3D />
                    </div>
                    
                    {/* Call to Action Buttons */}
                    <div className='flex w-full max-w-lg flex-col items-center gap-4 pb-2 md:gap-5 md:pb-0'>
                        <Button text={'Acelerar mi carrera'} accion={irAlSigin}/>
                        
                        <hr className='h-px w-28 border-none bg-slate-500/35' />
                        
                        <div className='w-full max-w-60'>
                            <SecundaryBtn text={'Iniciar sesion'} accion={irAlLogin}/>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    )
}
export default Home