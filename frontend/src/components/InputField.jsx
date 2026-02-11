const InputField = ({ type, Icono, placeholder, name, value, onChange, error }) => {
    return (
        <div>
            <label className={`flex items-center border ${error ? 'border-red-600' : 'border-[#D7D7D7]'} shadow-xs rounded-lg p-2 mb-4 mt-5`}>
                <input
                    type={type}
                    placeholder={placeholder}
                    className="placeholder:opacity-50 focus:outline-0 w-[90%] py-1"
                    name={name}      // Para que el handleChange sepa quién es
                    value={value}    // Para que muestre lo que dice la "libreta"
                    onChange={onChange}
                />
                {Icono && <Icono size={25} className={`opacity-60 ${error ? 'text-red-600' : 'text-gray-400'}`} />}
            </label>
            {error && <p className="text-red-500 text-xs mt-1 ml-1">{error}</p>}
        </div>

    )
}

export default InputField

