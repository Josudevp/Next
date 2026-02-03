const InputField = ({ type, Icono, placeholder, name, value, onChange }) => {
    return (
        <label className="flex items-center border border-[#D7D7D7] shadow-xs rounded-lg p-2 mb-4 mt-5">
            <input
                type={type}
                placeholder={placeholder}
                className="placeholder:opacity-50 focus:outline-0 w-[90%] py-1"
                required
                name={name}      // Para que el handleChange sepa quién es
                value={value}    // Para que muestre lo que dice la "libreta"
                onChange={onChange}
            />
            {Icono && <Icono size={25} className='opacity-60' />}
        </label>
    )
}

export default InputField

