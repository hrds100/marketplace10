"use client"
import React, { Suspense, lazy } from 'react'
import Layout from '../components/layout'
import { useSearchParams } from 'next/navigation'
import Skeleton from '../details/skeleton';

const Upcoming = lazy(() => import('./upcoming'));
const UpcomingPage = lazy(() => import('./upcomingPage'));

const Page = () => {
    const searchParams = useSearchParams();
    const id = searchParams.get("id");

    return (
        <Layout>
            <div className=" h-full flex flex-col gap-8">
                <Suspense fallback={<Skeleton source="upcoming" />}>
                    {id ? <UpcomingPage /> : <Upcoming />}
                </Suspense>
            </div>
        </Layout >
    )
}

export default Page