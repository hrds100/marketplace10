import Image from "next/image"
import TableForm from "./table"

const Table = ({ title, columns, rows , pagination}) => {
    const totalColumns = `grid-cols-${columns.length}`
    return (
        <div className="">
            <div className="pb-2.5 pt-6  xl:pb-1">
                <div className="mb-6 flex justify-between">
                    <div>
                        <h4 className="text-title-lg font-bold text-black 2xl:text-5xl">
                            {title}
                        </h4>
                    </div>

                </div>

                <TableForm columns={columns} rows={rows} pagination={pagination}/>
            </div>
        </div>
    )
}

export default Table