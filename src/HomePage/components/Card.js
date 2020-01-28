import React from 'react';

const Card = (props) => {
  const { imageSrc, webpSrc, mp4Src, webmSrc } = props;

  return (
    <div className="card-body">
      <div className="card-img-container">
        {/* <div className="hide-hover">
        <picture>
          <source srcSet={webpSrc} type="image/webp" />
          <img alt="bg" src={imageSrc} className="card-img" />
        </picture>
        </div> */}
        <video preload autoPlay loop muted playsInline width="600px">  
          <source src={webmSrc} type="video/webm" />  
          <source src={mp4Src} type="video/mp4" />  
        </video>
      </div>
    </div>
  );
};

export default Card;
