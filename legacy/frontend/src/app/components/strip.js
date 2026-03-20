import { returnAmount } from "@/utils/showAmount"

const Strip = ({ price="0", color = "#6C0CF0" }) => {
    return (
        <div className="relative">
            <svg width="170" height="40" className="2xl:w-[250px] 2xl:h-[70px]" viewBox="0 0 206 53" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 53L0 45H8V53Z" fill={color} />
                <path d="M0 8C0 3.58172 3.58172 0 8 0H198C202.418 0 206 3.58172 206 8V37C206 41.4183 202.418 45 198 45H0V8Z" fill="#954AFC" />
            </svg>
            <div className="flex items-center gap-2 w-full text-white absolute top-1/2 left-3 -translate-y-[55%]">
                <span className="font-bold text-sm 2xl:text-2xl">{price}</span>
                <small className="text-[0.6rem] 2xl:text-sm">Rent Cost</small>
            </div>
        </div>
    )
}

export default Strip