import PropTypes from 'prop-types';

const DefaultSelect = ({ label, className, value, onChange, options }) => {
  return (
    <>
      <label className='pt-5 mb-[10px] block text-base font-medium text-dark dark:text-black'>
        {label}
      </label>
      <div className='relative z-20'>
        <select
          className={`relative z-20 w-full appearance-none rounded-lg border border-stroke dark:border-dark-3 bg-transparent py-[10px] px-5 text-dark-6 outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-gray-2 ${className}`}
          value={value}
          onChange={onChange}
        >
          {options.map((option, index) => (
            <option key={index} value={option.value} className='dark:bg-dark-2'>
              {option.label}
            </option>
          ))}
        </select>
        <span className='absolute right-4 top-1/2 z-10 mt-[-2px] h-[10px] w-[10px] -translate-y-1/2 rotate-45 border-r-2 border-b-2 border-body-color'></span>
      </div>
    </>
  );
};

DefaultSelect.propTypes = {
  label: PropTypes.string.isRequired,
  className: PropTypes.string,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired
    })
  ).isRequired
};

export default DefaultSelect;