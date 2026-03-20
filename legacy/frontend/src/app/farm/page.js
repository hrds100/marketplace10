import Layout from "../components/layout"
import Farm from "./farm"


const page = () => {
    return (
        <Layout>
            <div className=" h-full flex flex-col gap-8">
                <Farm />
            </div>
        </Layout>
    )
}

export default page