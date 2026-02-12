import Robot3D from '../components/Robot3D'
import SecundaryBtn from '../components/SecundaryBtn'
import Button from '../components/Button'
import LogoGemini from '../assets/Logos/Gemini.svg'

const Home = () => {
    return (
        <>
            <div className='p-3 py-5 flex flex-col bg-linear-to-b from-[#EFEFEF] from-50% via-[#BED5F3] via-75% to-[#587BA8] gap-4'>
                <h2 className='text-next-primary text-3xl font-bold mb-8'>Next</h2>
                <div className='text-center flex flex-col gap-3'>
                    <h1 className='text-3xl font-bold text-pretty'>Busca <span className='text-[#3B82F6]'>empleo</span> con la confianza de un <span className='text-[#3B82F6]'>experto</span></h1>
                    <p className='-mb-15 px-4 text-pretty'>
                        Next es el instructor IA que transforma tu perfil académico en una marca profesional imparable, guiándote hacia las vacantes donde tu talento brilla.
                    </p>
                     <Robot3D />
                </div>
                <div>
                    <div className='flex flex-col gap-4'>
                        <div className='px-5'>
                            <Button text={'Acelerar mi carrera'} />
                        </div>
                        <hr className='opacity-45 mx-10' />
                        <div className='px-10'>
                            <SecundaryBtn text={'Iniciar sesion'} />
                        </div>
                    </div>
                </div>
                <footer className='flex text-white text-xs mt-10 justify-between'>
                    <p className='text-pretty'><span className='font-semibold'>Elaborado por: </span>Josue Molina y Nataly Piedrahita</p>
                    <div className='flex items-center'>
                        <p className='text-xs'>Potenciado por Gemini AI</p>
                        <img src={LogoGemini} alt="Logo de gemini" className='size-6' />
                    </div>
                </footer>
            </div>
        </>
    )
}
export default Home