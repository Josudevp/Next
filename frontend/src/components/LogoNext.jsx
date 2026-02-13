import logo from '../assets/Logos/Logo-Next-noBg.svg'

const LogoNext = () => {
    return (
        <div className='flex items-center gap-2 w-full'>
            <img src={logo} alt="" className='w-13' />
            <h2 className='text-next-primary text-4xl font-semibold'>Next</h2>
        </div>
    )
}

export default LogoNext