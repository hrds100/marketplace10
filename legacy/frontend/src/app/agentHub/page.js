import React from 'react'
import Layout from '../components/layout'
import Agent from './agent'

const page = () => {
    return (
        <Layout>
            <div className=" h-full flex flex-col gap-8">
                <Agent />
            </div>
        </Layout>
    )
}

export default page