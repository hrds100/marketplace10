import React from 'react'
import Layout from '../components/layout'
import Portfolio from './portfolio'

const page = () => {
    return (
        <Layout>
            <div className=" h-full flex flex-col gap-8">
                <Portfolio />
            </div>
        </Layout>
    )
}

export default page