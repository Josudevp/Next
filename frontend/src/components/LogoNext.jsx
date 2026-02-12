import logo from '../assets/Logos/Logo-Next-noBg.svg'

const LogoNext = () => {
    return (
        <div className='flex items-center gap-4 w-full'>
            <img src={logo} alt="" className='w-14' />
            <h2 className='text-next-primary text-3xl font-bold'>Next</h2>
        </div>
    )
}

export default LogoNext