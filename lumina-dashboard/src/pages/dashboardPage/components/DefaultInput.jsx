import { useState } from 'react';
import PropTypes from 'prop-types';

const DefaultInput = ({ label, className, value, onChange, additionalComponent }) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  return (
    <>
       <div className="pt-5 flex items-center gap-2 mb-[10px]">
        <label className='block text-base font-medium text-dark dark:text-black'>
          {label}
        </label>
        {additionalComponent && additionalComponent}
      </div>
      {typeof value === 'boolean' ? (
        <label className='flex items-center cursor-pointer select-none text-dark dark:text-black'>
          <div className='relative'>
            <input
              type='checkbox'
              checked={value}
              onChange={onChange}
              className='sr-only'
            />
            <div className='box mr-4 flex h-5 w-5 items-center justify-center rounded border border-stroke dark:border-dark-3'>
              <span className={`text-primary ${value ? 'opacity-100' : 'opacity-0'}`}>
                <svg
                  className='h-[24px] w-[24px] stroke-current'
                  color='blue'
                  fill='none'
                  viewBox='0 0 24 24'
                  xmlns='http://www.w3.org/2000/svg'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='3'
                    d='M6 18L18 6M6 6l12 12'
                  ></path>
                </svg>
              </span>
            </div>
          </div>
        </label>
      ) : (
        <input
          type='text'
          placeholder={label}
          value={value}
          onChange={onChange}
          className={`w-full bg-transparent rounded-md border py-[10px] px-5 text-dark-6 outline-none transition ${
            isFocused
              ? 'border-primary text-dark-5'
              : 'border-stroke dark:border-dark-3'
          } focus:border-primary active:border-primary disabled:cursor-default disabled:bg-gray-2 disabled:border-gray-2 ${className}`}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      )}
    </>
  );
};

DefaultInput.propTypes = {
  label: PropTypes.string.isRequired,
  className: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]).isRequired,
  onChange: PropTypes.func.isRequired,
  additionalComponent: PropTypes.element
};

export default DefaultInput;