const Skip = () => {
  return (
    <div className='flex p-4 md:p-12 rounded-lg items-center justify-center flex-col gap-8 bg-[#F1F3F4]'>
      <button
        type='button'
        className='px-8 py-2 rounded-full text-white font-medium bg-[#0B6BDA] text-base'
      >
        Yes, i want to upgrade my investment
      </button>
      <p>
        Skip, I dont want to buy $1000 in shares for $900 and get a 10% discount
      </p>
    </div>
  )
}

export default Skip
