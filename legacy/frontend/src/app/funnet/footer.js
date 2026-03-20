const Footer = () => {
  return (
    <div className="flex items-center justify-center flex-wrap p-4 md:p-8 border-t-2">
      <div className="flex max-w-5xl w-full justify-between items-center 2xl:max-w-[90rem]">
        <div className="flex items-center gap-2 text-[#142D63]">
          <p className="font-medium">© {new Date().getFullYear()} NfsTay.</p>
          <p className="font-medium">All Rights Reserved</p>
        </div>
        {/* <div className="flex items-center gap-5">
                    <Image
                        src={fb}
                        width={30}
                        height={30}
                        alt="facebook"
                    />
                    <Image
                        src={tw}
                        width={30}
                        height={30}
                        alt="twitter"
                    />
                    <Image
                        src={ig}
                        width={30}
                        height={30}
                        alt="instagram"
                    />
                    <Image
                        src={ln}
                        width={30}
                        height={30}
                        alt="linkedin"
                    />

                </div> */}
      </div>
    </div>
  );
};

export default Footer;
