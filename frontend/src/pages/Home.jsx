import Robot3D from '../components/Robot3D'
import SecundaryBtn from '../components/SecundaryBtn'
import Button from '../components/Button'
import LogoGemini from '../assets/Logos/Gemini.svg'
import LogoNext from '../components/LogoNext'

const Home = () => {
    return (
        <main className='bg-linear-to-b from-[#EFEFEF] from-50% via-[#BED5F3] via-75% to-[#587BA8] min-h-screen md:h-screen flex flex-col justify-between px-6 py-6 md:px-16 md:py-8 overflow-y-auto md:overflow-hidden'>
            {/* Logo - Always Top Left */}
            <div className='mb-4 md:mb-0 md:absolute md:top-8 md:left-16'>
                <LogoNext />
            </div>

            {/* Hero Section */}
            <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-8 md:gap-12 max-w-7xl mx-auto w-full flex-1'>
                
                {/* Content Section */}
                <section className='flex flex-col gap-6 md:w-1/2 md:gap-8 md:pt-12'>
                    {/* Main Heading and Description */}
                    <div className='flex flex-col gap-4 md:gap-6'>
                        <h1 className='text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-center md:text-left leading-tight text-pretty'>
                            Busca <span className='text-[#3B82F6]'>empleo</span> con la confianza de un <span className='text-[#3B82F6]'>experto</span>
                        </h1>
                        
                        <p className='text-sm md:text-base lg:text-lg xl:text-xl text-center md:text-left text-pretty leading-relaxed'>
                            Next es el instructor IA que transforma tu perfil académico en una marca profesional imparable, guiándote hacia las vacantes donde tu talento brilla.
                        </p>
                    </div>
                </section>
                
                {/* Interactive Section */}
                <section className='flex flex-col items-center gap-6 md:gap-8 md:w-1/2'>
                    {/* 3D Robot */}
                    <div className='w-full flex justify-center'>
                        <Robot3D />
                    </div>
                    
                    {/* Call to Action Buttons */}
                    <div className='flex flex-col items-center gap-4 md:gap-6 w-full'>
                        <Button text={'Acelerar mi carrera'} />
                        
                        <hr className='w-34 border-none h-px bg-gray-400 opacity-80' />
                        
                        <SecundaryBtn text={'Iniciar sesion'} />
                    </div>
                </section>
            </div>
            
            {/* Footer */}
            <footer className='flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center text-white text-xs max-w-7xl mx-auto w-full mt-4'>
                <p className='text-pretty text-center sm:text-left'>
                    <span className='font-semibold'>Elaborado por: </span>
                    Josue Molina y Nataly Piedrahita
                </p>
                
                <div className='flex items-center justify-center gap-2'>
                    <p className='text-xs'>Potenciado por Gemini AI</p>
                    <img 
                        src={LogoGemini} 
                        alt="Logo de Gemini" 
                        className='size-6' 
                    />
                </div>
            </footer>
        </main>
    )
}
export default Home