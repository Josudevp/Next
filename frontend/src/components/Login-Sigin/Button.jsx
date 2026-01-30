const Button = ({text}) => {
    return (
        <button className="px-14 py-3 text-white bg-linear-to-r from-[#1B49AE] from-40% via-[#3473FF] via-80% to-[#2563EB] to-100% rounded-xl font-medium sm:text-sm md:text-lg mt-5 cursor-pointer w-full">{text}</button>
    )
}

export default Button