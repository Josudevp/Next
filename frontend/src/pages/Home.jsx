import { useNavigate } from 'react-router-dom'
import Robot3D from '../components/Robot3D'
import SecundaryBtn from '../components/SecundaryBtn'
import Button from '../components/Button'
import LogoNext from '../components/LogoNext'
import Seo from '../components/Seo'

const homeStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Next Job Hunter',
    url: 'https://next-frontend.onrender.com/',
    description: 'Plataforma con IA para crear CV, practicar entrevistas y encontrar el primer empleo.',
    inLanguage: 'es-CO',
}

const Home = () => {

    const navigate = useNavigate()

    const irAlSigin = () => {
        navigate('/signin')
    }

    const irAlLogin = () => {
        navigate('/login')
    }

    return (
        <>
            <Seo
                title='Next Job Hunter | IA para CV, entrevistas y primer empleo'
                description='Next Job Hunter transforma tu perfil en una marca profesional con IA: crea tu CV, practica entrevistas y encuentra mejores oportunidades.'
                keywords='Next Job Hunter, IA para empleo, creador de CV, entrevistas con IA, primer empleo, empleabilidad'
                path='/'
                structuredData={homeStructuredData}
            />
            <main className='relative min-h-dvh overflow-hidden bg-linear-to-b from-[#EFEFEF] via-[#DCE5F3] to-[#8DA8D8] px-5 py-4 sm:px-6 md:h-dvh md:px-10 md:py-6 lg:px-16'>
            {/* Logo - Always Top Left */}
            <nav className='absolute top-4 left-5 z-20 sm:left-6 md:top-6 md:left-16'>
                <LogoNext />
            </nav>

            {/* BETA badge */}
            <div className='absolute top-4 right-5 z-20 sm:right-6 md:top-6 md:right-10 lg:right-16'>
                <span className='inline-flex items-center gap-1.5 bg-next-primary/10 border border-next-primary/30 text-next-primary text-[11px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full'>
                    <span className='w-1.5 h-1.5 rounded-full bg-next-primary animate-pulse' />
                    Beta
                </span>
            </div>

            <div className='pointer-events-none absolute inset-x-0 bottom-0 h-[42vh] bg-linear-to-t from-[#5F7FB5]/80 via-[#AFC1E7]/35 to-transparent' />

            {/* Hero Section */}
            <div className='relative z-10 mx-auto flex min-h-dvh w-full max-w-7xl flex-1 flex-col items-center justify-center gap-6 pt-16 pb-6 md:h-full md:min-h-0 md:flex-row md:items-center md:justify-center md:gap-12 md:pt-6 md:pb-6 lg:gap-16'>
                
                {/* Content Section */}
                <section className='flex w-full flex-col items-center gap-4 pt-0 md:w-1/2 md:items-start md:gap-5 md:pt-0'>
                    {/* Main Heading and Description */}
                    <div className='flex w-full max-w-88 flex-col gap-3 md:max-w-none md:gap-4'>
                        <h1 className='text-center text-[2.25rem] font-bold leading-[0.96] text-pretty text-black sm:text-[2.65rem] md:text-left md:text-[2.9rem] lg:text-[3.3rem] xl:text-[3.6rem]'>
                            Busca <span className='text-[#3B82F6]'>empleo</span> con la confianza de un <span className='text-[#3B82F6]'>experto</span>
                        </h1>
                        
                        <p className='mx-auto max-w-80 text-[0.95rem] text-center text-slate-800 text-pretty leading-relaxed sm:max-w-xl sm:text-[1rem] md:mx-0 md:max-w-xl md:text-left lg:text-[1.12rem]'>
                            Next es el instructor IA que transforma tu perfil académico en una marca profesional imparable, guiándote hacia las vacantes donde tu talento brilla.
                        </p>
                    </div>
                </section>
                
                {/* Interactive Section */}
                <section className='flex w-full flex-col items-center justify-start gap-5 pt-2 pb-2 md:w-1/2 md:justify-center md:gap-7 md:pt-0 md:pb-0'>
                    {/* 3D Robot - Hidden on mobile */}
                    <div className='hidden w-full justify-center md:flex'>
                        <Robot3D />
                    </div>
                    
                    {/* Call to Action Buttons */}
                    <div className='flex w-full max-w-sm flex-col items-center gap-4 pb-0 md:max-w-lg md:gap-5 md:pb-0'>
                        <Button text={'Acelerar mi carrera'} accion={irAlSigin}/>
                        
                        <hr className='h-px w-28 border-none bg-slate-500/35' />
                        
                        <div className='flex w-full justify-center md:w-auto'>
                            <SecundaryBtn text={'Iniciar sesion'} accion={irAlLogin}/>
                        </div>
                    </div>
                </section>
            </div>
            </main>
        </>
    )
}
export default Home