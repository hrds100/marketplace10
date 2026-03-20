import Image from "next/image"
import Marquee from "react-fast-marquee"
import b1 from "../images/b-1.png"
import b2 from "../images/b-2.png"
import b3 from "../images/b-3.png"
import b4 from "../images/b-4.png"
import b5 from "../images/b-5.png"
import b6 from "../images/b-6.png"
import b7 from "../images/b-7.png"
import b8 from "../images/b-8.png"
import b9 from "../images/b-9.png"
import b10 from "../images/b-10.png"

const RealEstate = () => {
    const images = [
        b1,
        b2,
        b3,
        b4,
        b5,
        b6,
        b7,
        b8,
        b9,
        b10
        
      


    ]
    const images1 = [
        b1,
        b2,
        b3,
        b4,
        b5,
        b6,
        b7,
        b8,
        b9,
        b10
        



    ]



    return (
        <div className="flex flex-col gap-8 py-8 w-full">
            <div className="flex items-center p-4 self-center justify-center w-full max-w-xl 2xl:max-w-4xl">
                <h1 className="text-[32px] leading-[48px] 2xl:text-5xl text-center font-bold">
                    Begin building your Real Estate Empire with Fractional Ownership
                </h1>
            </div>
            <div className="flex flex-col gap-3 lr-shadow shadow-inner">
                <Marquee speed={30}>
                    <div className="flex overflow-hidden max-w-screen w-full">
                        <div className="flex gap-3 mr-3">
                            {
                                images.map((img, index) => (
                                    <Image key={index} src={img} width={300} height={200} className="rounded-xl" alt="Real Estate" />
                                ))
                            }
                        </div>
                    </div>
                </Marquee>
                <Marquee speed={30}  direction="right">
                    <div className="flex overflow-hidden max-w-screen w-full">
                        <div className="flex gap-3 mr-3">
                            {
                                images1.reverse().map((img, index) => (
                                    <Image key={index} src={img} width={300} height={200} className="rounded-xl" alt="Real Estate" />
                                ))
                            }
                        </div>
                    </div>
                </Marquee>

            </div>

        </div>
    )
}

export default RealEstate