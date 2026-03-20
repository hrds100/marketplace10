"use client"
import {useState} from 'react'
import Masonry, { ResponsiveMasonry } from 'react-responsive-masonry';
import {Li} from '../components/faq';

const Faq = () => {

    const faqData = [
        {
            question: "How Do We Know Where To Go?",
            answer:
                "We prioritize the security of your insurance information. We use advanced encryption and strict data protection measures to ensure your data is safe and confidential.",
        },
        {
            question: "Does Nfstay Work With Coin Gecko?",
            answer:
                "Our insurance plans are customizable. You can tailor your coverage to meet your specific needs and budget.",
        },
        {
            question: "Is It Easy To Learn?",
            answer:
                "There may be a waiting period for certain insurance claims, depending on the policy terms and conditions. Please refer to your policy documents for details.",
        },
        {
            question: "Is It Easy To Learn?",
            answer:
                "Our insurance plans are customizable. You can tailor your coverage to meet your specific needs and budget.",
        },
        {
            question: "Do I Need To Code?",
            answer:
                "There may be a waiting period for certain insurance claims, depending on the policy terms and conditions. Please refer to your policy documents for details.",
        },
        {
            question: "Do I Need To Code?",
            answer:
                "There may be a waiting period for certain insurance claims, depending on the policy terms and conditions. Please refer to your policy documents for details.",
        },
    ];

 


  return (
    <div className="flex flex-col justify-center items-center p-4 md:p-8 gap-8">
        <h1 className="text-3xl font-semibold">Frequently asked questions</h1>
        <p >Everything you need to know about being an august founder</p>
        <div className="flex items-center justify-center w-full">



<ResponsiveMasonry
    columnsCountBreakPoints={{ 350: 1, 750: 2,}}
    className="w-full h-full max-w-5xl"

>
    <Masonry
        gutter="12px"
    >
        {faqData.map((faq, index) => (
           
            <Li key={index} faq={faq} />
        ))}
    </Masonry>
</ResponsiveMasonry>






</div>
    </div>
  )
}

export default Faq