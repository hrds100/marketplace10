'use client'
const Select = ({ name, title, options, value, handleValueChange }) => {
    return (
        <select value={value} onChange={handleValueChange} className="shadow-2 p-2   border outline-none rounded-lg 2xl:text-lg" name={name} >
            <option value="" default className="opacity-20">{title}</option>
            {
                options.map((option, index) => (
                    <option key={index} value={option.value}>{option.label}</option>
                ))
            }
        </select>
    )
}

export default Select