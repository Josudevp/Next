const SecundaryBtn = ({text, accion}) => {
    return (
        <button className="px-14 py-3 md:py-4 text-black border border-cyan-900 rounded-2xl md:rounded-[2rem] font-medium text-sm md:text-base lg:text-lg cursor-pointer" onClick={accion}>{text}</button>
    )
}

export default SecundaryBtn