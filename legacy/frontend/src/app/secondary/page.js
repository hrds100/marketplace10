"use client"
import React, { Suspense, lazy } from 'react'
import Layout from '../components/layout'
import NotFound from '../not-found'
import { useSearchParams } from 'next/navigation'
import Skeleton from '../details/skeleton'
const SecondaryPage = lazy(() => import('./secondaryPage'));

const Page = () => {
    const searchParams = useSearchParams();
    const id = searchParams.get("id");

    return (
        <Layout>
            <div className=" h-full flex flex-col gap-8">
                <Suspense fallback={<Skeleton source={"secondary"} />}>
                    {id ? <SecondaryPage /> : <NotFound />}
                </Suspense>
            </div>
        </Layout >
    )
}

export default Page