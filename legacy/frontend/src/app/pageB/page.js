"use client"
import { useState } from 'react'
import Layout from '../components/layout'
import PageB from './pageB'
import NotFound from '../not-found'

const Page = () => {
  const [isRestricted, setIsRestricted] = useState(true)
  return (
    // <Layout isRestricted={isRestricted} setIsRestricted={setIsRestricted}>
    //   <div className=" h-full flex flex-col gap-8">
    //     <PageB />
    //   </div>
    // </Layout>
    <NotFound/>
  )
}

export default Page
