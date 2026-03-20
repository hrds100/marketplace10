import Layout from "../components/layout"
import Settings from "./settings"


const page = () => {
    return (
        <Layout>
            <div className=" h-full flex flex-col gap-8">
                <Settings />
            </div>
        </Layout >
    )
}

export default page