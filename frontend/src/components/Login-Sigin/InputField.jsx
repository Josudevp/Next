const InputField = ({ type, Icono, placeholder }) => {
    return (
        <label className="flex items-center border border-[#D7D7D7] shadow-xs rounded-lg p-2 mb-4 mt-5">
            <input
                type={type}
                placeholder={placeholder}
                className="placeholder:opacity-50 focus:outline-0 w-[90%] py-1"
            />
            {Icono && <Icono size={25} className='opacity-60' />}
        </label>
    )
}

export default InputField

