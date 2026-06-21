const ActiveInput = () => {
    return (
      <>
        <label className='mb-[10px] block text-base font-medium text-dark dark:text-white'>
          Active Input
        </label>
        <input
          type='text'
          placeholder='Active Input'
          className='w-full bg-transparent rounded-md border border-primary py-[10px] px-5 text-dark-5 outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-gray-2 disabled:border-gray-2'
        />
      </>
    )
  }

export default ActiveInput;