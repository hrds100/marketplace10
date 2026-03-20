"use client"
import { useState } from 'react'
import Layout from '../components/layout'
import PageA from './pageA'
import NotFound from '../not-found'

const Page = () => {
  const [isRestricted, setIsRestricted] = useState(true)
  return (
    // <Layout isRestricted={isRestricted} setIsRestricted={setIsRestricted}>
    //   <div className=" h-full flex flex-col gap-8">
    //     <PageA />
    //   </div>
    // </Layout>
    <NotFound/>
  )
}

export default Page
