const Button = ({text}) => {
    return (
        <button className="px-14 py-3 md:py-4 text-white bg-gradient-to-r from-[#1B49AE] from-40% via-[#3473FF] via-80% to-next-primary to-100% rounded-2xl md:rounded-[2rem] font-medium text-sm md:text-base lg:text-lg cursor-pointer">{text}</button>
    )
}

export default Button
