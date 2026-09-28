import React from "react";

interface LogoProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className = "h-7 w-auto", alt = "Kinetiq logo", ...props }) => {
  return (
    <img
      src="/kinetiq_mark_vector.svg"
      alt={alt}
      className={className}
      {...props}
    />
  );
};
