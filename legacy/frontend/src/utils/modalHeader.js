

const ModalHeader = ({ title, handleClose }) => {
    return (
        <div className="flex items-center border-b-2 w-full justify-between pb-3 gap-10">
            <h1 className="text-lg whitespace-pre-line  sm:text-xl font-bold">{title}</h1>
            <button type="button" className=" flex items-center justify-center " onClick={handleClose}>

                <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path opacity="0.1" d="M18 33C26.2843 33 33 26.2843 33 18C33 9.71573 26.2843 3 18 3C9.71573 3 3 9.71573 3 18C3 26.2843 9.71573 33 18 33Z" stroke="black" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                    <path d="M22 14L14 22" stroke="black" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                    <path d="M14 14L22 22" stroke="black" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                </svg>



            </button>
        </div>
    )
}

export default ModalHeader