const SkeletonRow = () => {
  return (
    <tr className='animate-pulse '>
      {/* Skeleton Image Column */}
      <td className='flex items-center w-fit gap-2 p-4'>
        <div className='bg-gray-300 h-9 w-9 shrink-0 rounded-full'></div>
        <div className='bg-gray-300 h-5 w-32 rounded'></div>
      </td>
      <td className='p-4 text-sm text-[#0C0839] 2xl:text-lg'>
        <div className='h-5 bg-gray-300 rounded w-full'></div>
      </td>
      <td className='p-4 text-sm text-[#0C0839] 2xl:text-lg'>
        <div className='h-5 bg-gray-300 rounded w-full'></div>
      </td>
      <td className='p-4 text-sm text-[#0C0839] 2xl:text-lg'>
        <div className='h-5 bg-gray-300 rounded w-full'></div>
      </td>
      <td className='p-4 text-sm text-[#0C0839] 2xl:text-lg'>
        <div className='h-5 bg-gray-300 rounded w-full'></div>
      </td>
      <td className='p-4 text-sm text-[#0C0839] 2xl:text-lg'>
        <div className='h-5 bg-gray-300 rounded w-full'></div>
      </td>
      <td className='p-4 text-sm flex items-center justify-center gap-2 text-[#0C0839] 2xl:text-lg'>
        <div className='h-9 bg-gray-300 rounded w-32'></div>
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='4'
          height='16'
          className="animate-pulse"
          viewBox='0 0 4 16'
          fill='none'
        >
          <circle cx='2' cy='2' r='2' fill='#A260FD' />
          <circle cx='2' cy='8' r='2' fill='#A260FD' />
          <circle cx='2' cy='14' r='2' fill='#A260FD' />
        </svg>
      </td>
    </tr>
  )
}

const TableForm = ({ isLoading, columns, rows, pagination }) => {
  const renderRows = () => {
    if (isLoading) {
      // Render skeleton rows if loading
      return Array(3)
        .fill(0)
        .map((_, index) => <SkeletonRow key={index} />)
    }

    // Render actual rows when not loading

    return rows()
  }

  return (
    <>
      <div className='overflow-x-auto w-full'>
        <table className='w-full min-w-full shrink-0 whitespace-nowrap'>
          {/* Table Header */}
          <thead>
            <tr className='text-sm text-[#0C0839] opacity-40 2xl:text-lg'>
              {columns.map((column, key) => (
                <th key={key} className={`text-center p-4`}>
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          {/* Table Rows */}
          <tbody>{renderRows()}</tbody>
        </table>
      </div>
      {pagination && pagination()}
    </>
  )
}

export default TableForm
