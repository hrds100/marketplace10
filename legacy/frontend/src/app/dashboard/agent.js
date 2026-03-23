import Image from 'next/image'
import agent from '../images/agent.svg'


const Agent = () => {
    return (
        <div className="w-full">
            <div className="pb-2.5 pt-6  xl:pb-1">
                <div className="mb-6 flex justify-between">
                    <div>
                        <h4 className="text-title-lg font-bold text-black 2xl:text-5xl">
                            Become an nfstay Agent
                        </h4>
                    </div>
                </div>
                <div className="w-full rounded-xl bg-[#F7F6FF]  flex justify-between flex-col md:flex-row md:px-12 pt-8">
                    <div className="p-4 md:p-8  justify-center  flex flex-col gap-3">
                        <h1 className="text-title-lg font-bold text-black 2xl:text-5xl">We are hiring</h1>
                        <p className=" text-black text-sm 2xl:text-lg">Looking for Agents to join our team</p>
                        <button className="px-4 py-2 w-fit btn_primary_gradient rounded-full backdrop-blur-[29.60px] justify-center items-center gap-1.5 flex">
                            <div className="text-white text-sm font-semibold 2xl:text-lg">Apply NOW!</div>
                        </button>
                        <svg className="my-4" xmlns="http://www.w3.org/2000/svg" width="325" height="2" viewBox="0 0 325 2" fill="none">
                            <path opacity="0.2" d="M0 1H325" stroke="#0C0839" />
                        </svg>
                        <div className="flex items-center gap-3">
                            <div className="flex -space-x-7 overflow-hidden isolate">
                                <Image
                                    alt=""
                                    width={40}
                                    height={40}
                                    src="https://images.unsplash.com/photo-1491528323818-fdd1faba62cc?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                                    className="inline-block h-12 w-12 rounded-full ring-2 ring-white"
                                />
                                <Image
                                    alt=""
                                    width={40}
                                    height={40}
                                    src="https://images.unsplash.com/photo-1550525811-e5869dd03032?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                                    className="inline-block h-12 w-12 rounded-full ring-2 ring-white -z-[1]"
                                />
                                <Image
                                    alt=""
                                    width={40}
                                    height={40}
                                    src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2.25&w=256&h=256&q=80"
                                    className="inline-block h-12 w-12 rounded-full ring-2 ring-white -z-[2]"
                                />

                            </div>
                            <div className="flex items-center flex-wrap gap-1"><span className="text-slate-900 text-base font-medium  leading-[23px]">Join</span><span className="text-slate-900 text-base font-semibold  leading-[23px]"> </span><span className="text-slate-900 text-base font-extrabold  leading-[23px]">200+</span><span className="text-slate-900 text-base font-semibold  leading-[23px]"> </span><span className="text-slate-900 text-base font-medium  leading-[23px]">others who signed up</span></div>
                        </div>
                    </div>
                    <div>

                        <Image
                            src={agent}
                            alt="agent"
                            width={500}
                            height={500}
                            className="2xl:w-[800px]"
                        />

                    </div>
                </div>

            </div>
        </div>
    )
}

export default Agent