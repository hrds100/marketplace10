import Layout from "../components/layout"
import Proposal from "./proposal"


const page = () => {
    return (
        <Layout>
            <div className=" h-full flex flex-col gap-8">
                <Proposal />
            </div>
        </Layout >
    )
}

export default page