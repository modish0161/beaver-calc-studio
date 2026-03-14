import React from "react";
import clsx from "clsx";

interface BeaverButtonProps {
  id?: string;
  title: string;
  rightIcon?: React.ReactNode;
  leftIcon?: React.ReactNode;
  containerClass?: string;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
}

const BeaverButton: React.FC<BeaverButtonProps> = ({
  id,
  title,
  rightIcon,
  leftIcon,
  containerClass,
  onClick,
  type = "button"
}) => {
  return (
    <button
      id={id}
      type={type}
      className={clsx(
        "group relative z-10 w-fit cursor-pointer overflow-hidden rounded-full bg-green-50 px-7 py-3 text-black border-2",
        containerClass
      )}
      onClick={onClick}
    >
      {leftIcon}
      <span className="relative inline-flex overflow-hidden font-general text-xs uppercase">
        <div className="translate-y-0 skew-y-0 transition duration-500 group-hover:translate-y-[-160%] group-hover:skew-y-12">
          {title}
        </div>
        <div className="absolute translate-y-[164%] skew-y-12 transition duration-500 group-hover:translate-y-0 group-hover:skew-y-0">
          {title}
        </div>
      </span>
      {rightIcon}
    </button>
  );
};

export default BeaverButton;
