"use client";
import {
  InstagramOutlined,
  LinkedinFilled,
  LockOutlined,
  XOutlined,
} from "@ant-design/icons";
import Image from "next/image";
import Link from "next/link";
import speaker from "../images/speaker.avif";
const Footer = () => {

  const links = [
                {title:"Privacy Policy", link:"https://docs.nfstay.com/legal/privacy-policy"},
                {title:"Cookies Policy", link: "https://docs.nfstay.com/legal/cookies-policy"},
                {title:"Terms and Conditions", link: "https://docs.nfstay.com/legal/terms-and-conditions"},
                {title:"Token Sales Agreement", link: "https://docs.nfstay.com/legal/token-sales-agreement-adelphi-wharf"},
               {title:"Disclaimer", link: "https://docs.nfstay.com/legal/disclaimer"},
              ]



  return (
    <footer className="relative mt-12">
      {/* Background Image */}
      <div
        className="absolute inset-0 w-full h-full -z-10"
        style={{
          backgroundImage: `url(https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-OlYp3OHpbPF5h2ITGFSVWl16z1y8yI.png)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      {/* Main Footer Content */}
      <div className="container mx-auto px-4 pt-20 pb-8">
        {/* CTA Section */}
        <div className="max-w-4xl mx-auto text-center mb-20 ">
          <div className="inline-block px-6 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur mb-6">
            <p className="text-white/90 text-sm font-medium flex items-center gap-2">
              <Image
                src={speaker}
                alt="speaker"
                width={20}
                height={20}
                className="mr-2"
              />
              Are You Ready?
            </p>
          </div>
          <h2 className="text-white text-6xl font-semibold mb-4 leading-tight">
            Ready to invest in real estate and grow your portfolio?
          </h2>
          <p className="text-white/70 mb-8 max-w-2xl mx-auto">
            Join us and start owning shares of beautiful properties worldwide.
            Earn monthly rental income, participate in key decisions, and watch
            your investments grow.
          </p>
          <a
            href="#"
            className="inline-block px-8 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
          >
            Get Started Now
          </a>
        </div>

        {/* Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Company Info */}
          <div className="flex flex-col col-span-2">
            <div className="flex flex-col flex-1">
              <Link href="/" className="inline-block mb-2">
                <svg
                  width="159"
                  height="35"
                  viewBox="0 0 159 35"
                  fill="none"
                  id="svg-27857384_3473"
                >
                  <g clip-path="url(#svg-27857384_3473_clip0_6646_4350)">
                    <path
                      d="M16.36 -0.03125V15.735L6.11451 -0.03125H0V25.4086H6.11451V9.72338L16.36 25.4086H22.4909V-0.03125H16.36Z"
                      fill="white"
                    ></path>
                    <path
                      d="M27.6406 -0.03125V25.4086H33.7715V15.1192H41.427V10.2905H33.7715V4.94329H44.0006V-0.03125H27.6406Z"
                      fill="white"
                    ></path>
                    <path
                      d="M46.7885 11.1654C46.7885 18.5867 57.6733 16.2371 57.6733 19.4941C57.6733 20.4015 56.8373 21.1306 55.2636 21.1306C53.5915 21.1306 52.3293 20.1908 52.1981 18.7811H46.1328C46.4279 22.6862 50.0015 25.7001 55.3456 25.7001C60.3454 25.7001 63.4272 23.0427 63.4272 19.5427C63.3289 12.008 52.5096 14.2765 52.5096 11.0519C52.5096 10.0797 53.2965 9.49638 54.739 9.49638C56.4439 9.49638 57.493 10.4038 57.6733 11.7811H63.3288C62.9354 7.79499 60.0667 4.89453 54.9193 4.89453C49.69 4.89453 46.7885 7.73018 46.7885 11.1654Z"
                      fill="white"
                    ></path>
                    <path
                      d="M66.5391 -0.03125V4.94329H73.2109V25.4086H79.3254V4.94329H85.9809V-0.03125H66.5391Z"
                      fill="white"
                    ></path>
                    <path
                      fill-rule="evenodd"
                      clip-rule="evenodd"
                      d="M97.3732 4.89453C100.34 4.89453 102.455 6.27185 103.537 8.05425V5.1862H109.651V25.4084H103.537V22.5404C102.422 24.3228 100.308 25.7001 97.3405 25.7001C92.4718 25.7001 88.5703 21.633 88.5703 15.2649C88.5703 8.88064 92.4718 4.89453 97.3732 4.89453ZM99.1601 20.2881C101.488 20.2881 103.537 18.5218 103.537 15.2973C103.537 12.0728 101.488 10.2904 99.1601 10.2904C96.8651 10.2904 94.7996 12.0404 94.7996 15.2649C94.7996 18.4894 96.8651 20.2881 99.1601 20.2881Z"
                      fill="white"
                    ></path>
                    <path
                      d="M127.861 5.1875L123.271 17.8264L118.648 5.1875H111.812L119.943 24.713L115.37 35.0023H121.943L134.484 5.1875H127.861Z"
                      fill="white"
                    ></path>
                    <path
                      d="M132.242 25.6503C132.242 26.2174 132.685 26.6712 133.357 26.6712C134.013 26.6712 134.472 26.2174 134.472 25.6503C134.472 25.067 134.013 24.6133 133.357 24.6133C132.685 24.6133 132.242 25.067 132.242 25.6503Z"
                      fill="white"
                    ></path>
                    <path
                      d="M134.977 23.4962C134.977 25.4569 136.239 26.6722 138.042 26.6722C139.567 26.6722 140.648 25.7648 140.976 24.3388H138.976C138.812 24.7925 138.517 25.0518 138.009 25.0518C137.337 25.0518 136.878 24.5171 136.878 23.4962C136.878 22.4592 137.337 21.9245 138.009 21.9245C138.517 21.9245 138.829 22.1999 138.976 22.6374H140.976C140.648 21.1629 139.567 20.3203 138.042 20.3203C136.239 20.3203 134.977 21.5356 134.977 23.4962Z"
                      fill="white"
                    ></path>
                    <path
                      fill-rule="evenodd"
                      clip-rule="evenodd"
                      d="M144.555 20.3203C146.342 20.3203 147.735 21.5356 147.735 23.4962C147.735 25.4569 146.326 26.6722 144.539 26.6722C142.736 26.6722 141.375 25.4569 141.375 23.4962C141.375 21.5356 142.768 20.3203 144.555 20.3203ZM144.539 25.0356C145.195 25.0356 145.817 24.5333 145.817 23.4962C145.817 22.443 145.211 21.9569 144.555 21.9569C143.883 21.9569 143.293 22.443 143.293 23.4962C143.293 24.5333 143.85 25.0356 144.539 25.0356Z"
                      fill="white"
                    ></path>
                    <path
                      d="M154.237 21.4864C153.811 20.741 153.074 20.3359 152.156 20.3359C151.352 20.3359 150.729 20.6762 150.369 21.1785V20.4008H148.5V26.5744H150.369V23.2202C150.369 22.41 150.828 21.9725 151.549 21.9725C152.254 21.9725 152.713 22.41 152.713 23.2202V26.5744H154.565V23.2202C154.565 22.41 155.024 21.9725 155.746 21.9725C156.45 21.9725 156.91 22.41 156.91 23.2202V26.5744H158.778V22.9771C158.778 21.3082 157.795 20.3359 156.287 20.3359C155.401 20.3359 154.631 20.8383 154.237 21.4864Z"
                      fill="white"
                    ></path>
                  </g>
                  <defs>
                    <clipPath id="svg-27857384_3473_clip0_6646_4350">
                      <rect width="158.846" height="35" fill="white"></rect>
                    </clipPath>
                  </defs>
                </svg>
                {/* <Image src={logo}   width={100}
                                height={40} alt="Company Logo" className="h-8 mix-blend-lighten" /> */}
              </Link>
              <p className="text-white/70 max-w-xs mb-6">
                Co-own real estate with as little as $1000. Always secure,
                always rewarding.
              </p>
              <div className="flex gap-4">
                <a href="#" className="">
                  <XOutlined className="w-5 h-5 text-xl text-white" />
                </a>
                <a href="#" className="">
                  <InstagramOutlined className="w-5 h-5 text-xl text-white" />
                </a>
                <a href="#" className="">
                  <LinkedinFilled className="w-5 h-5 text-xl text-white" />
                </a>
              </div>
            </div>
          </div>

          {/* Explore Links */}
          <div>
            <h3 className="text-white text-lg font-semibold mb-4">Explore</h3>
            <ul className="space-y-3">
              {["Home", "How it works", "Features", "FAQ", "Team"].map(
                (item) => (
                  <li key={item}>
                    <Link
                      href={`/#${item.toLowerCase().replace(" ", "-")}`}
                      className="text-white/70 hover:text-white transition-colors"
                    >
                      {item}
                    </Link>
                  </li>
                )
              )}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="text-white text-lg font-semibold mb-4">Legal</h3>
            <ul className="space-y-3">
              {links.map((item) => (
                <li key={item}>
                  <a
                    target="_blank"
                    href={item.link}
                    className="text-white/70 hover:text-white transition-colors"
                  >
                    {item.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-4 w-full">
          <p className="text-white/60 text-xs  col-span-2">
            Made with ❤️ in the 🇬🇧 | Copyright nfstay.com | All Rights Reserved.
          </p>
          <div className="flex items-center gap-2">
            <LockOutlined className="w-4 h-4 text-lg text-white/70" />
            <span className="text-white/70 text-sm">
              Safe and Secure SSL Encrypted
            </span>
          </div>
        </div>
        {/* Legal Text */}
        <div className=" pt-12">
          <p className="text-white/60 text-sm mb-6 leading-relaxed">
            nfstay operates as a general partnership and not as a passive
            investment vehicle. This means that every co-owner is an active
            partner, with a direct and ongoing role in managing the property.
            Through our platform, all major decisions—whether related to tenant
            approval, property management strategies, or significant
            renovations—are made collectively by the co-owners through a
            democratic voting system. Each partner has an equal voice, ensuring
            transparency and control over the property’s future. Unlike passive
            investments where investors relinquish control, nfstay empowers
            co-owners to take part in the daily operations and strategic
            direction of their assets. Our easy-to-use technology enables
            seamless participation, allowing every partner to engage in key
            decision-making processes. This ensures that co-ownership is
            collaborative and active, making nfstay a true general partnership
            where all partners share equal responsibility for the property’s
            success. While nfstay facilitates co-ownership, it is important to
            note that nfstay is not a registered investment advisor,
            broker-dealer, or financial planner. The content and materials
            available on this platform, including property details and
            investment projections, should not be interpreted as offers to sell,
            solicitations to buy, or recommendations regarding any security or
            investment opportunity. Users are solely responsible for determining
            whether an investment aligns with their individual financial goals,
            risk tolerance, and portfolio strategy. Given the risks associated
            with real estate investments—such as market volatility, liquidity
            challenges, and potential loss of capital—nfstay strongly encourages
            users to consult with licensed financial planners, legal counsel, or
            tax professionals before making any decisions based on the
            opportunities presented on the platform. nfstay does not guarantee
            the performance, appreciation, or capital returns of any real estate
            investment offered. By participating in co-ownership or fractional
            ownership opportunities, users acknowledge the inherent risks,
            including fluctuations in property values, tenant risks, regulatory
            changes, and broader economic factors that may influence investment
            performance. Additionally, all co-ownership agreements and
            investment products facilitated by nfstay are designed to comply
            with relevant UK regulations, including the Financial Services and
            Markets Act (FSMA), and adhere to robust anti-money laundering (AML)
            and know-your-customer (KYC) standards. Independent legal and
            regulatory oversight, provided by Frederik Lund, ensures nfstay
            operates in full compliance with industry best practices. By
            accessing or using the platform, users agree to nfstay’s Terms of
            Service, Privacy Policy, and all applicable disclosures related to
            the specific investment products being considered.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
