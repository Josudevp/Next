import { Link } from 'react-router-dom'
import logo from '../assets/Logos/Logo-Next-noBg.svg'

const LogoNext = ({ to }) => {
    const inner = (
        <div className='flex items-center gap-2'>
            <img src={logo} alt="" className='w-8' />
            <h2 className='text-next-primary text-3xl font-semibold'>Next</h2>
        </div>
    )
    if (to) {
        return (
            <Link to={to} className='flex items-center'>
                {inner}
            </Link>
        )
    }
    return inner
}

export default LogoNext