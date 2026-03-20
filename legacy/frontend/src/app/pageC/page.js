"use client"
import { useState } from 'react'
import Layout from '../components/layout'
import PageC from './pageC'


const Page = () => {
  const [isRestricted, setIsRestricted] = useState(true)
  return (
    <Layout isRestricted={isRestricted} setIsRestricted={setIsRestricted}>
      <div className=" h-full flex flex-col gap-8">
        <PageC />
      </div>
    </Layout>
  )
}

export default Page
