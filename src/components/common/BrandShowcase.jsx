import LogoImg from '../../assets/Logo.png';
import './BrandShowcase.css';

function joinClasses(...classNames) {
  return classNames.filter(Boolean).join(' ');
}

const BrandShowcase = ({
  size = 'hero',
  tone = 'dark',
  className = '',
  circleClassName = '',
  imageClassName = '',
  alt = 'CS Study Room Logo',
}) => {
  return (
    <div className={joinClasses('brand-showcase', `brand-showcase--${size}`, `brand-showcase--${tone}`, className)}>
      <div className={joinClasses('brand-showcase__circle', circleClassName)}>
        <img src={LogoImg} alt={alt} className={joinClasses('brand-showcase__image', imageClassName)} />
      </div>
    </div>
  );
};

export default BrandShowcase;