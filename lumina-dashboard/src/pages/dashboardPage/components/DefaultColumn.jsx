import PropTypes from 'prop-types';

const DefaultColumn = ({ children }) => {
  return (
    <div className='w-full px-4 md:w-1/2 lg:w-1/3'>
      <div className='mb-12'>{children}</div>
    </div>
  );
};

export default DefaultColumn;

DefaultColumn.propTypes = {
  children: PropTypes.node.isRequired,
};